import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ShoppingCart, Minus, Plus, Zap, Shield, Clock, Copy, Check, ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const DISCORD_INVITE = "https://discord.gg/t2VrGXbTV";

const PRODUCTS = [
  {
    id: "monthly",
    name: "Monthly License",
    price: 9.27,
    currency: "EUR",
    iconType: "clock",
    features: ["30 days access", "All scripts included", "Priority support"]
  },
  {
    id: "lifetime",
    name: "Lifetime License",
    price: 17.38,
    currency: "EUR",
    iconType: "infinity",
    features: ["Permanent access", "All future updates", "VIP Discord role"]
  }
];

// Header Component
const Header = ({ cartItems, setCartOpen }) => {
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-black/80 border-b border-zinc-800">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <a href="/" className="font-heading text-2xl text-primary tracking-tight" data-testid="logo">
          Grim<span className="text-white">AIO</span>
        </a>
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              className="relative p-2 hover:bg-zinc-800" 
              data-testid="cart-sheet-trigger"
            >
              <ShoppingCart className="h-6 w-6 text-white" />
              {totalItems > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-primary text-black px-1.5 min-w-5 h-5 flex items-center justify-center text-xs font-mono">
                  {totalItems}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-[#050505] border-l border-zinc-800 w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle className="text-white font-heading">Your Cart</SheetTitle>
            </SheetHeader>
            <CartContent cartItems={cartItems} setCartOpen={setCartOpen} />
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

// Cart Content Component
const CartContent = ({ cartItems, setCartOpen }) => {
  const [loading, setLoading] = useState(false);
  
  const total = cartItems.reduce((sum, item) => {
    const product = PRODUCTS.find(p => p.id === item.productId);
    return sum + (product?.price || 0) * item.quantity;
  }, 0);

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    
    setLoading(true);
    try {
      // Process first item in cart (single product checkout)
      const item = cartItems[0];
      const response = await axios.post(`${API}/checkout`, {
        product_id: item.productId,
        quantity: item.quantity,
        origin_url: window.location.origin
      });
      
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to create checkout session");
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <ShoppingCart className="h-12 w-12 mb-4" />
        <p className="font-mono">Your cart is empty</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full mt-6">
      <div className="flex-1 space-y-4">
        {cartItems.map((item, index) => {
          const product = PRODUCTS.find(p => p.id === item.productId);
          if (!product) return null;
          
          return (
            <div 
              key={index} 
              className="flex justify-between items-center p-4 border border-zinc-800 bg-zinc-900/50"
              data-testid="cart-item"
            >
              <div>
                <p className="text-white font-mono">{product.name}</p>
                <p className="text-zinc-500 text-sm">Qty: {item.quantity}</p>
              </div>
              <p className="text-primary font-mono text-lg">
                €{(product.price * item.quantity).toFixed(2)}
              </p>
            </div>
          );
        })}
      </div>
      
      <div className="border-t border-zinc-800 pt-4 mt-4 space-y-4">
        <div className="flex justify-between items-center" data-testid="cart-total">
          <span className="text-zinc-400 font-mono">Total</span>
          <span className="text-white text-2xl font-mono">€{total.toFixed(2)}</span>
        </div>
        <Button 
          onClick={handleCheckout}
          disabled={loading}
          className="w-full bg-primary text-black hover:bg-[#00cc00] font-mono font-bold tracking-widest uppercase py-6 text-sm"
          data-testid="cart-checkout-btn"
        >
          {loading ? "Processing..." : "Checkout with Stripe"}
        </Button>
      </div>
    </div>
  );
};

// Product Card Component
const ProductCard = ({ product, selected, onSelect }) => {
  const renderIcon = () => {
    if (product.iconType === "clock") {
      return <Clock className="h-5 w-5" />;
    }
    return <span className="text-lg font-mono">∞</span>;
  };
  
  return (
    <button
      onClick={() => onSelect(product.id)}
      className={`w-full p-4 md:p-6 border transition-all duration-200 text-left ${
        selected 
          ? "border-primary bg-[#0A0A0A] shadow-[0_0_15px_rgba(0,255,0,0.15)]" 
          : "border-zinc-800 bg-[#0A0A0A] hover:border-zinc-700"
      }`}
      data-testid={`product-${product.id}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 flex items-center justify-center border ${selected ? "border-primary text-primary" : "border-zinc-700 text-zinc-500"}`}>
            {renderIcon()}
          </div>
          <span className={`font-mono text-lg ${selected ? "text-white" : "text-zinc-400"}`}>
            {product.name}
          </span>
        </div>
        <span className={`font-mono text-xl md:text-2xl ${selected ? "text-primary" : "text-zinc-500"}`}>
          €{product.price.toFixed(2)}
        </span>
      </div>
    </button>
  );
};

// Quantity Selector Component
const QuantitySelector = ({ quantity, setQuantity }) => {
  return (
    <div className="flex items-center border border-zinc-800 w-fit">
      <button
        onClick={() => setQuantity(Math.max(1, quantity - 1))}
        className="w-10 h-10 flex items-center justify-center hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
        data-testid="quantity-decrease"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span 
        className="w-12 text-center font-mono text-white"
        data-testid="quantity-display"
      >
        {quantity}
      </span>
      <button
        onClick={() => setQuantity(Math.min(10, quantity + 1))}
        className="w-10 h-10 flex items-center justify-center hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
        data-testid="quantity-increase"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
};

// Purchase Terminal Component
const PurchaseTerminal = ({ cartItems, setCartItems }) => {
  const [selectedProduct, setSelectedProduct] = useState("monthly");
  const [quantity, setQuantity] = useState(1);

  const selectedProductData = PRODUCTS.find(p => p.id === selectedProduct);
  const total = selectedProductData ? selectedProductData.price * quantity : 0;

  const handleAddToCart = () => {
    // Replace cart with new item (single product cart for simplicity)
    setCartItems([{ productId: selectedProduct, quantity }]);
    toast.success(`Added ${quantity}x ${selectedProductData?.name} to cart`);
  };

  return (
    <div className="border border-zinc-800 bg-[#0A0A0A] p-6 md:p-8">
      <div className="mb-2">
        <Badge className="bg-primary/20 text-primary border-primary/30 font-mono text-xs tracking-wider">
          SOFTWARE KEY
        </Badge>
      </div>
      
      <h2 className="text-2xl md:text-3xl font-heading text-white mb-2">
        GrimAIO Key Details
      </h2>
      
      <p className="text-zinc-400 mb-6">
        GrimAIO is a premium modern software for power users. Get up and running with monitor and control with your product.
      </p>

      {/* Features */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-8 text-sm">
        <div className="flex items-center gap-2 text-zinc-400">
          <Zap className="h-4 w-4 text-primary" />
          <span>Instant activation</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <Shield className="h-4 w-4 text-primary" />
          <span>Secure & encrypted</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <Clock className="h-4 w-4 text-primary" />
          <span>24/7 Discord support</span>
        </div>
      </div>

      {/* Variant Selection */}
      <div className="mb-6">
        <p className="text-zinc-500 text-xs font-mono tracking-wider mb-3">VARIANT</p>
        <div className="space-y-3">
          {PRODUCTS.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              selected={selectedProduct === product.id}
              onSelect={setSelectedProduct}
            />
          ))}
        </div>
      </div>

      {/* Quantity */}
      <div className="mb-6">
        <p className="text-zinc-500 text-xs font-mono tracking-wider mb-3">QUANTITY</p>
        <div className="flex items-center gap-6">
          <QuantitySelector quantity={quantity} setQuantity={setQuantity} />
          <div className="text-zinc-400">
            Total: <span className="text-primary font-mono text-xl">€{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Add to Cart Button */}
      <Button
        onClick={handleAddToCart}
        className="w-full bg-primary text-black hover:bg-[#00cc00] font-mono font-bold tracking-widest uppercase py-6 text-sm transition-all"
        data-testid="add-to-cart-btn"
      >
        <ShoppingCart className="h-4 w-4 mr-2" />
        Add to Cart
      </Button>
    </div>
  );
};

// Home Page Component
const HomePage = () => {
  const [cartItems, setCartItems] = useState([]);

  return (
    <div className="min-h-screen bg-[#050505]">
      <Header cartItems={cartItems} />
      
      {/* Background effect */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#00FF00]/5 via-[#050505] to-[#050505] pointer-events-none" />
      
      <main className="relative max-w-6xl mx-auto px-6 py-12 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Left Column - Branding */}
          <div className="space-y-8">
            <div>
              <h1 className="text-5xl md:text-7xl font-heading text-white tracking-tighter uppercase mb-4">
                Grim<span className="text-primary">AIO</span>
              </h1>
              <p className="text-zinc-500 font-mono tracking-widest text-sm">
                UNDETECTED. UNMATCHED.
              </p>
            </div>
            
            <p className="text-zinc-400 text-lg leading-relaxed max-w-md">
              Premium Roblox scripts with instant key activation. Join thousands of power users with our secure and encrypted solution.
            </p>

            {/* Discord Button */}
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-6 py-3 border border-primary/50 text-primary hover:bg-primary/10 transition-all font-mono tracking-wider"
              data-testid="discord-join-btn"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Join Discord
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          {/* Right Column - Purchase Terminal */}
          <PurchaseTerminal cartItems={cartItems} setCartItems={setCartItems} />
        </div>
      </main>
    </div>
  );
};

// Success Page Component
const SuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState("loading");
  const [keys, setKeys] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [attempts, setAttempts] = useState(0);

  const pollPaymentStatus = useCallback(async () => {
    if (!sessionId) {
      setStatus("error");
      return;
    }

    try {
      const response = await axios.get(`${API}/checkout/status/${sessionId}`);
      const data = response.data;

      if (data.payment_status === "paid") {
        setStatus("success");
        if (data.keys && data.keys.length > 0) {
          setKeys(data.keys);
        }
      } else if (data.status === "expired") {
        setStatus("expired");
      } else if (attempts < 5) {
        setAttempts(prev => prev + 1);
        setTimeout(pollPaymentStatus, 2000);
      } else {
        setStatus("timeout");
      }
    } catch (error) {
      console.error("Error checking status:", error);
      if (attempts < 5) {
        setAttempts(prev => prev + 1);
        setTimeout(pollPaymentStatus, 2000);
      } else {
        setStatus("error");
      }
    }
  }, [sessionId, attempts]);

  useEffect(() => {
    pollPaymentStatus();
  }, []);

  const copyToClipboard = (key, index) => {
    navigator.clipboard.writeText(key);
    setCopiedIndex(index);
    toast.success("Key copied to clipboard!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-6">
      <div className="max-w-lg w-full">
        {status === "loading" && (
          <div className="text-center">
            <div className="w-16 h-16 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-heading text-white mb-2">Processing Payment</h1>
            <p className="text-zinc-500 font-mono">Please wait while we verify your payment...</p>
          </div>
        )}

        {status === "success" && (
          <div className="border border-primary bg-[#0A0A0A] p-8 shadow-[0_0_30px_rgba(0,255,0,0.2)]">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-heading text-white mb-2">Payment Successful!</h1>
              <p className="text-zinc-400">Your script keys are ready</p>
            </div>

            {keys.length > 0 && (
              <div className="space-y-4 mb-8">
                <p className="text-zinc-500 text-xs font-mono tracking-wider">YOUR KEYS</p>
                {keys.map((key, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-4 bg-black border border-zinc-800"
                    data-testid={`key-${index}`}
                  >
                    <code className="text-primary font-mono text-lg">{key}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(key, index)}
                      className="text-zinc-400 hover:text-white"
                    >
                      {copiedIndex === index ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#5865F2] text-white font-mono tracking-wider hover:bg-[#4752C4] transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Join Discord for Support
              </a>
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                className="w-full border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 font-mono"
              >
                Back to Store
              </Button>
            </div>
          </div>
        )}

        {(status === "error" || status === "expired" || status === "timeout") && (
          <div className="border border-red-500/50 bg-[#0A0A0A] p-8 text-center">
            <h1 className="text-2xl font-heading text-white mb-2">
              {status === "expired" ? "Session Expired" : "Something went wrong"}
            </h1>
            <p className="text-zinc-400 mb-6">
              {status === "expired" 
                ? "Your payment session has expired. Please try again."
                : "We couldn't verify your payment. If you were charged, please contact support."}
            </p>
            <Button
              onClick={() => navigate("/")}
              className="bg-primary text-black hover:bg-[#00cc00] font-mono"
            >
              Return to Store
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/success" element={<SuccessPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" theme="dark" />
    </div>
  );
}

export default App;
