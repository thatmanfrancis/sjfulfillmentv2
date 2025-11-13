"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number | null;
  inventory: Array<{ quantityAvailable: number }>;
}

interface Currency {
  id: string;
  code: string;
  symbol: string;
}

interface Merchant {
  id: string;
  businessName: string;
}

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateOrderModal({ isOpen, onClose, onSuccess }: CreateOrderModalProps) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<Merchant[]>([]);
  const [merchantSearch, setMerchantSearch] = useState("");
  const [showMerchantDropdown, setShowMerchantDropdown] = useState(false);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingMerchants, setLoadingMerchants] = useState(false);
  const [error, setError] = useState<string>("");
  
  const [formData, setFormData] = useState({
    merchantId: "",
    currencyId: "",
    customerId: "",
    customerType: "existing", // existing or new
    newCustomer: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
    },
    items: [{ productId: "", quantity: 1, price: 0 }],
    shippingAddress: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "US",
    },
    notes: "",
    priority: "normal",
  });

  const selectedCurrency = currencies.find(c => c.id === formData.currencyId) as Currency | undefined;
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Customer, 2: Items, 3: Shipping, 4: Review

  useEffect(() => {
    if (isOpen) {
      fetchCustomersAndProducts();
    }
    // If the modal is opened by a merchant, auto-select their merchant and hide search
    if (isOpen && user?.role === "MERCHANT") {
      (async () => {
        try {
          const resp = await api.get<{ merchants: Merchant[] }>("/api/merchants");
          if (resp.ok && resp.data) {
            const list = resp.data.merchants || [];
            if (list.length > 0) {
              setFormData(prev => ({ ...prev, merchantId: list[0].id }));
              setMerchantSearch(list[0].businessName);
              // also fetch merchant details to set merchant currency
              try {
                const mresp = await api.get(`/api/merchants/${list[0].id}`);
                if (mresp.ok && mresp.data?.merchant?.currency?.id) {
                  setFormData(prev => ({ ...prev, currencyId: mresp.data.merchant.currency.id }));
                }
              } catch (err) {
                console.warn('Failed to fetch merchant details for currency', err);
              }
            }
          }
        } catch (err) {
          console.warn("Failed to auto-select merchant for merchant user", err);
        }
      })();
    }
  }, [isOpen]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.customer-search-container')) {
        setShowCustomerDropdown(false);
      }
      if (!target.closest('.merchant-search-container')) {
        setShowMerchantDropdown(false);
      }
    };

    if (showCustomerDropdown || showMerchantDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCustomerDropdown, showMerchantDropdown]);

  const fetchCustomersAndProducts = async () => {
    setLoadingData(true);
    setError("");
    try {
      const [productsResponse, currenciesResponse] = await Promise.all([
        api.get("/api/products"),
        api.get("/api/currencies")
      ]);

      // Don't fetch all customers or merchants upfront - wait for search
      if (productsResponse.ok) {
        setProducts(productsResponse.data.products || []);
      }
      if (currenciesResponse.ok) {
        const currencyList = currenciesResponse.data.currencies || [];
        setCurrencies(currencyList);
        // Auto-select USD if available
        const usdCurrency = currencyList.find((c: Currency) => c.code === "USD");
        if (usdCurrency) {
          setFormData(prev => ({ ...prev, currencyId: usdCurrency.id }));
        } else if (currencyList.length > 0) {
          setFormData(prev => ({ ...prev, currencyId: currencyList[0].id }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setError("Failed to load required data. Please try again.");
    } finally {
      setLoadingData(false);
    }
  };

  const searchCustomers = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setFilteredCustomers([]);
      return;
    }

    setLoadingCustomers(true);
    try {
      const response = await api.get(
        `/api/customers?search=${encodeURIComponent(searchTerm)}&limit=50`
      );

      if (response.ok) {
        const customersList = response.data.customers || [];
        setFilteredCustomers(customersList);
      }
    } catch (error) {
      console.error("Failed to search customers:", error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleCustomerSearch = (value: string) => {
    setCustomerSearch(value);
    setShowCustomerDropdown(true);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      searchCustomers(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const selectCustomer = (customer: Customer) => {
    setFormData(prev => ({ ...prev, customerId: customer.id }));
    setCustomerSearch(`${customer.firstName} ${customer.lastName} - ${customer.email}`);
    setShowCustomerDropdown(false);
  };

  const searchMerchants = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setFilteredMerchants([]);
      return;
    }

    setLoadingMerchants(true);
    try {
      const response = await api.get(
        `/api/merchants?search=${encodeURIComponent(searchTerm)}&limit=50`
      );

      if (response.ok) {
        const merchantsList = response.data.merchants || [];
        setFilteredMerchants(merchantsList);
      }
    } catch (error) {
      console.error("Failed to search merchants:", error);
    } finally {
      setLoadingMerchants(false);
    }
  };

  const handleMerchantSearch = (value: string) => {
    setMerchantSearch(value);
    setShowMerchantDropdown(true);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      searchMerchants(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const selectMerchant = (merchant: Merchant) => {
    setFormData(prev => ({ ...prev, merchantId: merchant.id }));
    setMerchantSearch(merchant.businessName);
    setShowMerchantDropdown(false);
    // fetch merchant details to get merchant currency
    (async () => {
      try {
        const resp = await api.get(`/api/merchants/${merchant.id}`);
        if (resp.ok && resp.data?.merchant) {
          const m = resp.data.merchant;
          if (m.currency?.id) {
            setFormData(prev => ({ ...prev, currencyId: m.currency.id }));
          }
        }
      } catch (err) {
        console.warn('Failed to fetch merchant details for currency', err);
      }
    })();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validation
      if (!formData.merchantId) {
        setError("Please select a merchant");
        setLoading(false);
        return;
      }

      // Step 1: Create or get customer
      let customerId = formData.customerId;
      if (formData.customerType === "new") {
        if (!formData.newCustomer.firstName || !formData.newCustomer.lastName || !formData.newCustomer.email) {
          setError("Please fill in all required customer fields (First Name, Last Name, Email)");
          setLoading(false);
          return;
        }

        // Try to create customer, but if they exist, fetch and use existing
        const customerResponse = await api.post("/api/customers", {
          merchantId: formData.merchantId,
          firstName: formData.newCustomer.firstName,
          lastName: formData.newCustomer.lastName,
          email: formData.newCustomer.email,
          phone: formData.newCustomer.phone,
          company: formData.newCustomer.company,
        });

        if (customerResponse.ok) {
          customerId = customerResponse.data.customer.id;
        } else if (customerResponse.status === 409) {
          // Customer already exists, fetch them
          const existingCustomerResponse = await api.get(
            `/api/customers?merchantId=${formData.merchantId}&email=${encodeURIComponent(formData.newCustomer.email)}`
          );
          
          if (existingCustomerResponse.ok) {
            const existingCustomers = existingCustomerResponse.data.customers || [];
            const existingCustomer = existingCustomers.find(
              (c: Customer) => c.email.toLowerCase() === formData.newCustomer.email.toLowerCase()
            );
            
            if (existingCustomer) {
              customerId = existingCustomer.id;
              // Optionally inform user
              console.log("Using existing customer:", existingCustomer.email);
            } else {
              throw new Error("Customer exists but could not be retrieved");
            }
          } else {
            throw new Error("Customer already exists but could not be retrieved");
          }
        } else {
          throw new Error(customerResponse.error || "Failed to create customer");
        }
      }

      if (!customerId) {
        setError("Please select or create a customer");
        setLoading(false);
        return;
      }

      // Step 2: Create shipping address
      if (!formData.shippingAddress.street || !formData.shippingAddress.city || 
          !formData.shippingAddress.state || !formData.shippingAddress.zipCode) {
        setError("Please fill in all required shipping address fields");
        setLoading(false);
        return;
      }

      const shippingAddressResponse = await api.post("/api/customers/addresses", {
        customerId,
        type: "SHIPPING",
        addressLine1: formData.shippingAddress.street,
        city: formData.shippingAddress.city,
        state: formData.shippingAddress.state,
        postalCode: formData.shippingAddress.zipCode,
        countryCode: formData.shippingAddress.country,
        isDefault: false,
      });

      if (!shippingAddressResponse.ok) {
        throw new Error(shippingAddressResponse.error || "Failed to create shipping address");
      }
      const shippingAddressId = shippingAddressResponse.data.address.id;

      // Step 3: Create billing address (same as shipping for now)
      const billingAddressResponse = await api.post("/api/customers/addresses", {
        customerId,
        type: "BILLING",
        addressLine1: formData.shippingAddress.street,
        city: formData.shippingAddress.city,
        state: formData.shippingAddress.state,
        postalCode: formData.shippingAddress.zipCode,
        countryCode: formData.shippingAddress.country,
        isDefault: false,
      });

      if (!billingAddressResponse.ok) {
        throw new Error(billingAddressResponse.error || "Failed to create billing address");
      }
      const billingAddressId = billingAddressResponse.data.address.id;

      // Step 4: Validate items
      if (formData.items.length === 0 || formData.items.some(item => !item.productId || item.quantity < 1)) {
        setError("Please add at least one valid product with quantity");
        setLoading(false);
        return;
      }

      // Step 5: Prepare order items with product details
      const orderItems = formData.items.map(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }
        return {
          productId: item.productId,
          sku: product.sku,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: item.price,
        };
      });

      // Step 6: Create order
      const orderPayload = {
        merchantId: formData.merchantId,
        customerId,
        shippingAddressId,
        billingAddressId,
        currencyId: formData.currencyId,
        items: orderItems,
        notes: formData.notes,
        priority: formData.priority.toUpperCase(),
        channel: "MANUAL",
      };

      const orderResponse = await api.post("/api/orders", orderPayload);

      if (orderResponse.ok) {
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          merchantId: "",
          currencyId: "",
          customerId: "",
          customerType: "existing",
          newCustomer: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            company: "",
          },
          items: [{ productId: "", quantity: 1, price: 0 }],
          shippingAddress: {
            street: "",
            city: "",
            state: "",
            zipCode: "",
            country: "US",
          },
          notes: "",
          priority: "normal",
        });
        setCustomerSearch("");
        setFilteredCustomers([]);
        setShowCustomerDropdown(false);
        setStep(1);
        setError("");
      } else {
        throw new Error(orderResponse.error || "Failed to create order");
      }
    } catch (error: any) {
      console.error("Failed to create order:", error);
      setError(error.message || "Failed to create order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: "", quantity: 1, price: 0 }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h4 className="text-white font-medium">Order & Customer Information</h4>
            
            {/* Merchant Selection (admins can search; merchants auto-select) */}
            {user?.role === "MERCHANT" ? (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Merchant</label>
                <input type="hidden" value={formData.merchantId} />
                <div className="px-3 py-2 bg-black border border-gray-600 rounded-lg text-gray-300">{merchantSearch || 'Your merchant'}</div>
              </div>
            ) : (
              <div className="relative merchant-search-container">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Search Merchant <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={merchantSearch}
                    onChange={(e) => handleMerchantSearch(e.target.value)}
                    onFocus={() => {
                      setShowMerchantDropdown(true);
                      if (merchantSearch.length >= 2) {
                        searchMerchants(merchantSearch);
                      }
                    }}
                    placeholder="Type merchant name to search..."
                    className="w-full px-3 py-2 pr-10 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                    disabled={loadingData}
                    required
                  />
                  {merchantSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setMerchantSearch("");
                        setFormData(prev => ({ ...prev, merchantId: "" }));
                        setFilteredMerchants([]);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Merchant Dropdown */}
                {showMerchantDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {loadingMerchants ? (
                      <div className="px-4 py-3 text-gray-400 text-center">Searching merchants...</div>
                    ) : filteredMerchants.length > 0 ? (
                      filteredMerchants.map((merchant) => (
                        <button
                          key={merchant.id}
                          type="button"
                          onClick={() => selectMerchant(merchant)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-700 border-b border-gray-700 last:border-b-0 transition-colors"
                        >
                          <div className="text-white font-medium">{merchant.businessName}</div>
                          <div className="text-sm text-gray-400 mt-1">ID: {merchant.id}</div>
                        </button>
                      ))
                    ) : merchantSearch.length >= 2 ? (
                      <div className="px-4 py-3 text-gray-400 text-center">No merchants found</div>
                    ) : (
                      <div className="px-4 py-3 text-gray-400 text-center text-sm">Type at least 2 characters to search</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Currency Selection - Hidden when merchant selected, shows merchant currency */}
            {formData.merchantId ? (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Currency
                </label>
                <div className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-300">
                  {selectedCurrency ? `${selectedCurrency.code} - ${selectedCurrency.symbol}` : 'Loading...'}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Currency <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.currencyId}
                  onChange={(e) => setFormData(prev => ({ ...prev, currencyId: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  disabled={loadingData}
                  required
                >
                  <option value="">
                    {loadingData ? "Loading currencies..." : "Select currency"}
                  </option>
                  {currencies.map((currency) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.code} - {currency.symbol}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="space-y-3">
              <div>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="existing"
                    checked={formData.customerType === "existing"}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerType: e.target.value }))}
                    className="mr-2"
                  />
                  <span className="text-gray-300">Existing Customer</span>
                </label>
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="new"
                    checked={formData.customerType === "new"}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerType: e.target.value }))}
                    className="mr-2"
                  />
                  <span className="text-gray-300">New Customer</span>
                </label>
              </div>
            </div>

            {formData.customerType === "existing" ? (
              <div className="relative customer-search-container">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Search Customer <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => handleCustomerSearch(e.target.value)}
                    onFocus={() => {
                      setShowCustomerDropdown(true);
                      if (customerSearch.length >= 2) {
                        searchCustomers(customerSearch);
                      }
                    }}
                    placeholder="Type name or email to search..."
                    className="w-full px-3 py-2 pr-10 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                    disabled={loadingData}
                    required
                  />
                  {customerSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerSearch("");
                        setFormData(prev => ({ ...prev, customerId: "" }));
                        setFilteredCustomers([]);
                        setShowCustomerDropdown(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                {/* Dropdown Results */}
                {showCustomerDropdown && customerSearch.length >= 2 && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {loadingCustomers ? (
                      <div className="px-4 py-3 text-gray-400 text-center">
                        Searching...
                      </div>
                    ) : filteredCustomers.length > 0 ? (
                      filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => selectCustomer(customer)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-700 text-white border-b border-gray-700 last:border-b-0"
                        >
                          <div className="font-medium">
                            {customer.firstName} {customer.lastName}
                          </div>
                          <div className="text-sm text-gray-400">
                            {customer.email}
                            {customer.company && ` • ${customer.company}`}
                          </div>
                        </button>
                      ))
                    ) : customerSearch.length >= 2 ? (
                      <div className="px-4 py-3 text-gray-400 text-center">
                        No customers found. Try a different search or create a new customer.
                      </div>
                    ) : null}
                  </div>
                )}

                {customerSearch.length > 0 && customerSearch.length < 2 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Type at least 2 characters to search
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    First Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.newCustomer.firstName}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      newCustomer: { ...prev.newCustomer, firstName: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                    required={formData.customerType === "new"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.newCustomer.lastName}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      newCustomer: { ...prev.newCustomer, lastName: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                    required={formData.customerType === "new"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.newCustomer.email}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      newCustomer: { ...prev.newCustomer, email: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                    required={formData.customerType === "new"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.newCustomer.phone}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      newCustomer: { ...prev.newCustomer, phone: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Company (Optional)</label>
                  <input
                    type="text"
                    value={formData.newCustomer.company}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      newCustomer: { ...prev.newCustomer, company: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-white font-medium">Order Items</h4>
              <button
                type="button"
                onClick={addItem}
                className="text-[#f08c17] hover:text-orange-300 text-sm"
              >
                + Add Item
              </button>
            </div>
            
            {formData.items.map((item, index) => (
              <div key={index} className="border border-gray-600 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-gray-300">Item {index + 1}</span>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Product</label>
                    <select
                      value={item.productId}
                      onChange={(e) => {
                        const selectedProduct = products.find(p => p.id === e.target.value);
                        updateItem(index, "productId", e.target.value);
                        if (selectedProduct) {
                          updateItem(index, "price", selectedProduct.sellingPrice || 0);
                        } else {
                          updateItem(index, "price", 0);
                        }
                      }}
                      className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                      disabled={loadingData}
                    >
                      <option value="">
                        {loadingData ? "Loading products..." : "Select product"}
                      </option>
                        {products.map((product) => {
                        const totalStock = product.inventory.reduce((sum, inv) => sum + inv.quantityAvailable, 0);
                        return (
                          <option key={product.id} value={product.id}>
                            {product.name} - {selectedCurrency?.symbol ?? '$'}{(product.sellingPrice || 0).toFixed(2)}
                            {totalStock <= 10 && ` (Stock: ${totalStock})`}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity || ""}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        updateItem(index, "quantity", isNaN(val) ? 1 : Math.max(1, val));
                      }}
                      onBlur={(e) => {
                        // Ensure valid number on blur
                        const val = parseInt(e.target.value);
                        if (isNaN(val) || val < 1) {
                          updateItem(index, "quantity", 1);
                        }
                      }}
                      className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Price ({selectedCurrency?.code ?? 'USD'})
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{selectedCurrency?.symbol ?? '$'}</span>
                      <input
                        type="text"
                        value={item.price.toFixed(2)}
                        readOnly
                        disabled={!item.productId}
                        className="w-full pl-7 pr-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                        title={item.productId ? "Price is automatically set from the selected product" : "Select a product to see the price"}
                      />
                    </div>
                  </div>
                </div>
                    {item.productId && (
                  <div className="mt-2 text-right text-sm text-gray-400">
                    Subtotal: <span className="text-white font-medium">{selectedCurrency?.symbol ?? '$'}{(item.price * item.quantity).toFixed(2)} {selectedCurrency?.code ?? 'USD'}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h4 className="text-white font-medium">Shipping Information</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Street Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.shippingAddress.street}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingAddress: { ...prev.shippingAddress, street: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  City <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.shippingAddress.city}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingAddress: { ...prev.shippingAddress, city: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  State <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.shippingAddress.state}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingAddress: { ...prev.shippingAddress, state: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  ZIP Code <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.shippingAddress.zipCode}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingAddress: { ...prev.shippingAddress, zipCode: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
                <select
                  value={formData.shippingAddress.country}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingAddress: { ...prev.shippingAddress, country: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                >
                  <option value="US">United States</option>
                  <option value="NG">Nigeria</option>
                  <option value="CA">Canada</option>
                  <option value="UK">United Kingdom</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Order Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                rows={3}
                placeholder="Special instructions or notes..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        );

      case 4:
        const total = formData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return (
          <div className="space-y-4">
            <h4 className="text-white font-medium">Order Review</h4>
            
            <div className="bg-gray-800 p-4 rounded-lg">
              <h5 className="text-gray-300 font-medium mb-2">Customer</h5>
              {formData.customerType === "existing" ? (
                <p className="text-gray-400">Customer ID: {formData.customerId}</p>
              ) : (
                <div className="text-gray-400">
                  <p>{formData.newCustomer.firstName} {formData.newCustomer.lastName}</p>
                  <p>{formData.newCustomer.email}</p>
                  <p>{formData.newCustomer.phone}</p>
                  {formData.newCustomer.company && <p>{formData.newCustomer.company}</p>}
                </div>
              )}
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <h5 className="text-gray-300 font-medium mb-2">Items</h5>
              {formData.items.map((item, index) => {
                const product = products.find(p => p.id === item.productId);
                return (
                  <div key={index} className="flex justify-between text-gray-400 mb-1">
                    <span>{product?.name || `Product ID: ${item.productId}`}</span>
                    <span>{item.quantity} × {selectedCurrency?.symbol ?? '$'}{item.price.toFixed(2)} = {(selectedCurrency?.symbol ?? '$')}{(item.quantity * item.price).toFixed(2)} {selectedCurrency?.code ?? 'USD'}</span>
                  </div>
                );
              })}
              <div className="border-t border-gray-600 pt-2 mt-2">
                <div className="flex justify-between text-white font-medium">
                  <span>Total:</span>
                  <span>{selectedCurrency?.symbol ?? '$'}{total.toFixed(2)} {selectedCurrency?.code ?? 'USD'}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <h5 className="text-gray-300 font-medium mb-2">Shipping Address</h5>
              <div className="text-gray-400">
                <p>{formData.shippingAddress.street}</p>
                <p>{formData.shippingAddress.city}, {formData.shippingAddress.state} {formData.shippingAddress.zipCode}</p>
                <p>{formData.shippingAddress.country}</p>
              </div>
            </div>

            {formData.notes && (
              <div className="bg-gray-800 p-4 rounded-lg">
                <h5 className="text-gray-300 font-medium mb-2">Notes</h5>
                <p className="text-gray-400">{formData.notes}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Order">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Step Indicator */}
        <div className="flex justify-between items-center mb-6">
          {[1, 2, 3, 4].map((stepNumber) => (
            <div key={stepNumber} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= stepNumber ? 'bg-[#f08c17] text-black' : 'bg-gray-600 text-gray-400'
              }`}>
                {stepNumber}
              </div>
              {stepNumber < 4 && (
                <div className={`w-16 h-0.5 mx-2 ${
                  step > stepNumber ? 'bg-[#f08c17]' : 'bg-gray-600'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-600">
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            className="px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="px-4 py-2 bg-[#f08c17] text-black rounded-lg hover:bg-orange-500"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-[#f08c17] text-black rounded-lg hover:bg-orange-500 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Order"}
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}