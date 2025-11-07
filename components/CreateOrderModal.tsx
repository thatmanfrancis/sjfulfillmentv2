"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";
import { api } from "@/lib/api";

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
  price: number;
  stock: number;
}

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateOrderModal({ isOpen, onClose, onSuccess }: CreateOrderModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  const [formData, setFormData] = useState({
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
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Customer, 2: Items, 3: Shipping, 4: Review

  useEffect(() => {
    if (isOpen) {
      fetchCustomersAndProducts();
    }
  }, [isOpen]);

  const fetchCustomersAndProducts = async () => {
    setLoadingData(true);
    try {
      const [customersResponse, productsResponse] = await Promise.all([
        api.get("/api/customers"),
        api.get("/api/products")
      ]);

      if (customersResponse.ok) {
        setCustomers(customersResponse.data.customers || []);
      }
      if (productsResponse.ok) {
        setProducts(productsResponse.data.products || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post("/api/orders", formData);

      if (response.ok) {
        onSuccess();
        onClose();
        // Reset form
        setFormData({
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
        setStep(1);
      } else {
        throw new Error(response.error || "Failed to create order");
      }
    } catch (error) {
      console.error("Failed to create order:", error);
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
            <h4 className="text-white font-medium">Customer Information</h4>
            
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
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Customer
                </label>
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  disabled={loadingData}
                >
                  <option value="">
                    {loadingData ? "Loading customers..." : "Choose a customer"}
                  </option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.firstName} {customer.lastName}
                      {customer.company ? ` - ${customer.company}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
                  <input
                    type="text"
                    value={formData.newCustomer.firstName}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      newCustomer: { ...prev.newCustomer, firstName: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={formData.newCustomer.lastName}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      newCustomer: { ...prev.newCustomer, lastName: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.newCustomer.email}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      newCustomer: { ...prev.newCustomer, email: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
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
                          updateItem(index, "price", selectedProduct.price);
                        }
                      }}
                      className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                      disabled={loadingData}
                    >
                      <option value="">
                        {loadingData ? "Loading products..." : "Select product"}
                      </option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - ${product.price}
                          {product.stock <= 10 && ` (Stock: ${product.stock})`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => updateItem(index, "price", parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                    />
                  </div>
                </div>
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
                <label className="block text-sm font-medium text-gray-300 mb-2">Street Address</label>
                <input
                  type="text"
                  value={formData.shippingAddress.street}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingAddress: { ...prev.shippingAddress, street: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                <input
                  type="text"
                  value={formData.shippingAddress.city}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingAddress: { ...prev.shippingAddress, city: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
                <input
                  type="text"
                  value={formData.shippingAddress.state}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingAddress: { ...prev.shippingAddress, state: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">ZIP Code</label>
                <input
                  type="text"
                  value={formData.shippingAddress.zipCode}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingAddress: { ...prev.shippingAddress, zipCode: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-black border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#f08c17]"
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
              {formData.items.map((item, index) => (
                <div key={index} className="flex justify-between text-gray-400 mb-1">
                  <span>Product ID: {item.productId}</span>
                  <span>{item.quantity} × ${item.price} = ${(item.quantity * item.price).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-gray-600 pt-2 mt-2">
                <div className="flex justify-between text-white font-medium">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
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