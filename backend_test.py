import requests
import sys
import json
from datetime import datetime

class GrimAIOAPITester:
    def __init__(self, base_url="https://script-key-shop.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            
            result = {
                "test_name": name,
                "method": method,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "success": success,
                "response_data": None,
                "error": None
            }

            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    result["response_data"] = response.json()
                except:
                    result["response_data"] = response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    result["error"] = response.json()
                except:
                    result["error"] = response.text

            self.test_results.append(result)
            return success, response

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            result = {
                "test_name": name,
                "method": method,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": None,
                "success": False,
                "response_data": None,
                "error": str(e)
            }
            self.test_results.append(result)
            return False, None

    def test_api_root(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_get_products(self):
        """Test get all products endpoint"""
        success, response = self.run_test("Get Products", "GET", "products", 200)
        
        if success:
            try:
                products = response.json()
                print(f"   Found {len(products)} products")
                for product in products:
                    print(f"   - {product.get('name', 'Unknown')}: €{product.get('price', 0)}")
                
                # Validate product structure
                expected_products = ["monthly", "lifetime"]
                found_ids = [p.get('id') for p in products]
                
                if all(pid in found_ids for pid in expected_products):
                    print("   ✅ All expected products found")
                else:
                    print(f"   ⚠️  Missing products. Expected: {expected_products}, Found: {found_ids}")
                    
            except Exception as e:
                print(f"   ❌ Error parsing products: {e}")
        
        return success

    def test_get_specific_product(self, product_id):
        """Test get specific product endpoint"""
        return self.run_test(f"Get Product {product_id}", "GET", f"products/{product_id}", 200)

    def test_get_invalid_product(self):
        """Test get invalid product endpoint"""
        return self.run_test("Get Invalid Product", "GET", "products/invalid", 404)

    def test_create_checkout_session(self):
        """Test create checkout session"""
        checkout_data = {
            "product_id": "monthly",
            "quantity": 1,
            "origin_url": "https://script-key-shop.preview.emergentagent.com"
        }
        
        success, response = self.run_test(
            "Create Checkout Session", 
            "POST", 
            "checkout", 
            200, 
            data=checkout_data
        )
        
        if success:
            try:
                data = response.json()
                if 'url' in data and 'session_id' in data:
                    print(f"   ✅ Checkout session created: {data['session_id']}")
                    print(f"   ✅ Stripe URL generated: {data['url'][:50]}...")
                    return True, data['session_id']
                else:
                    print(f"   ❌ Missing required fields in response: {data}")
            except Exception as e:
                print(f"   ❌ Error parsing checkout response: {e}")
        
        return False, None

    def test_checkout_with_invalid_product(self):
        """Test checkout with invalid product"""
        checkout_data = {
            "product_id": "invalid",
            "quantity": 1,
            "origin_url": "https://script-key-shop.preview.emergentagent.com"
        }
        
        return self.run_test(
            "Checkout Invalid Product", 
            "POST", 
            "checkout", 
            400, 
            data=checkout_data
        )

    def test_checkout_with_invalid_quantity(self):
        """Test checkout with invalid quantity"""
        checkout_data = {
            "product_id": "monthly",
            "quantity": 15,  # Over limit of 10
            "origin_url": "https://script-key-shop.preview.emergentagent.com"
        }
        
        return self.run_test(
            "Checkout Invalid Quantity", 
            "POST", 
            "checkout", 
            400, 
            data=checkout_data
        )

    def test_checkout_status(self, session_id):
        """Test checkout status endpoint"""
        if not session_id:
            print("⚠️  Skipping checkout status test - no session ID")
            return False
            
        return self.run_test(
            "Get Checkout Status", 
            "GET", 
            f"checkout/status/{session_id}", 
            200
        )

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting GrimAIO API Tests")
        print("=" * 50)
        
        # Test basic endpoints
        self.test_api_root()
        self.test_get_products()
        self.test_get_specific_product("monthly")
        self.test_get_specific_product("lifetime")
        self.test_get_invalid_product()
        
        # Test checkout functionality
        success, session_id = self.test_create_checkout_session()
        self.test_checkout_with_invalid_product()
        self.test_checkout_with_invalid_quantity()
        
        # Test checkout status if we have a session
        if session_id:
            self.test_checkout_status(session_id)
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("❌ Some tests failed")
            
            # Print failed tests
            failed_tests = [t for t in self.test_results if not t['success']]
            if failed_tests:
                print("\n❌ Failed Tests:")
                for test in failed_tests:
                    print(f"   - {test['test_name']}: {test.get('error', 'Status code mismatch')}")
            
            return 1

def main():
    tester = GrimAIOAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())