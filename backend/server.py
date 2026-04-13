from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
import secrets
import string

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionResponse, 
    CheckoutStatusResponse, 
    CheckoutSessionRequest
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Product pricing - EUR (Fixed on backend for security)
PRODUCTS = {
    "monthly": {
        "id": "monthly",
        "name": "Monthly License",
        "description": "GrimAIO Monthly Script Key - 30 days access",
        "price": 9.27,
        "currency": "eur",
        "duration_days": 30
    },
    "lifetime": {
        "id": "lifetime",
        "name": "Lifetime License",
        "description": "GrimAIO Lifetime Script Key - Permanent access",
        "price": 17.38,
        "currency": "eur",
        "duration_days": None  # Lifetime
    }
}

# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class CheckoutRequest(BaseModel):
    product_id: str
    quantity: int = 1
    origin_url: str

class CheckoutResponse(BaseModel):
    url: str
    session_id: str

class PaymentStatusResponse(BaseModel):
    status: str
    payment_status: str
    amount_total: int
    currency: str
    metadata: Dict[str, str]
    keys: Optional[List[str]] = None

class ProductResponse(BaseModel):
    id: str
    name: str
    description: str
    price: float
    currency: str
    duration_days: Optional[int]

class ScriptKey(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    key: str
    product_id: str
    session_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None
    is_active: bool = True

def generate_script_key():
    """Generate a random script key in format: GRIM-XXXX-XXXX-XXXX"""
    chars = string.ascii_uppercase + string.digits
    parts = [''.join(secrets.choice(chars) for _ in range(4)) for _ in range(3)]
    return f"GRIM-{'-'.join(parts)}"

# Routes
@api_router.get("/")
async def root():
    return {"message": "GrimAIO API"}

@api_router.get("/products", response_model=List[ProductResponse])
async def get_products():
    """Get all available products"""
    return list(PRODUCTS.values())

@api_router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str):
    """Get a specific product"""
    if product_id not in PRODUCTS:
        raise HTTPException(status_code=404, detail="Product not found")
    return PRODUCTS[product_id]

@api_router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(request: Request, checkout_req: CheckoutRequest):
    """Create a Stripe checkout session"""
    if checkout_req.product_id not in PRODUCTS:
        raise HTTPException(status_code=400, detail="Invalid product")
    
    if checkout_req.quantity < 1 or checkout_req.quantity > 10:
        raise HTTPException(status_code=400, detail="Quantity must be between 1 and 10")
    
    product = PRODUCTS[checkout_req.product_id]
    total_amount = product["price"] * checkout_req.quantity
    
    # Get Stripe API key
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    # Build URLs from provided origin
    success_url = f"{checkout_req.origin_url}/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{checkout_req.origin_url}/"
    
    # Initialize Stripe checkout
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Metadata for tracking
    metadata = {
        "product_id": checkout_req.product_id,
        "product_name": product["name"],
        "quantity": str(checkout_req.quantity),
        "unit_price": str(product["price"]),
        "source": "grimaio_web"
    }
    
    # Create checkout session
    checkout_request = CheckoutSessionRequest(
        amount=float(total_amount),
        currency=product["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata
    )
    
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create pending transaction record
    transaction = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "product_id": checkout_req.product_id,
        "product_name": product["name"],
        "quantity": checkout_req.quantity,
        "amount": total_amount,
        "currency": product["currency"],
        "status": "pending",
        "payment_status": "initiated",
        "metadata": metadata,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payment_transactions.insert_one(transaction)
    
    return CheckoutResponse(url=session.url, session_id=session.session_id)

@api_router.get("/checkout/status/{session_id}", response_model=PaymentStatusResponse)
async def get_checkout_status(request: Request, session_id: str):
    """Get checkout session status and generate keys if paid"""
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        checkout_status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
    except Exception as e:
        logger.error(f"Failed to get checkout status: {str(e)}")
        # Return a pending status if we can't reach Stripe
        return PaymentStatusResponse(
            status="pending",
            payment_status="pending",
            amount_total=0,
            currency="eur",
            metadata={},
            keys=None
        )
    
    # Find the transaction
    transaction = await db.payment_transactions.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    keys = None
    
    # If payment is successful and keys haven't been generated
    if checkout_status.payment_status == "paid":
        # Update transaction status
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "status": "completed",
                "payment_status": "paid",
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Check if keys already generated for this session
        existing_keys = await db.script_keys.find(
            {"session_id": session_id},
            {"_id": 0, "key": 1}
        ).to_list(100)
        
        if existing_keys:
            keys = [k["key"] for k in existing_keys]
        else:
            # Generate keys
            quantity = int(checkout_status.metadata.get("quantity", "1"))
            product_id = checkout_status.metadata.get("product_id", "monthly")
            product = PRODUCTS.get(product_id, PRODUCTS["monthly"])
            
            keys = []
            for _ in range(quantity):
                script_key = generate_script_key()
                
                # Calculate expiration
                expires_at = None
                if product.get("duration_days"):
                    from datetime import timedelta
                    expires_at = (datetime.now(timezone.utc) + timedelta(days=product["duration_days"])).isoformat()
                
                key_doc = {
                    "id": str(uuid.uuid4()),
                    "key": script_key,
                    "product_id": product_id,
                    "session_id": session_id,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "expires_at": expires_at,
                    "is_active": True
                }
                await db.script_keys.insert_one(key_doc)
                keys.append(script_key)
    elif checkout_status.status == "expired":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "status": "expired",
                "payment_status": "expired"
            }}
        )
    
    return PaymentStatusResponse(
        status=checkout_status.status,
        payment_status=checkout_status.payment_status,
        amount_total=checkout_status.amount_total,
        currency=checkout_status.currency,
        metadata=checkout_status.metadata,
        keys=keys
    )

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Update transaction based on webhook
        if webhook_response.session_id:
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": {
                    "payment_status": webhook_response.payment_status,
                    "webhook_event_id": webhook_response.event_id,
                    "webhook_event_type": webhook_response.event_type,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
