"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateCurrencyForm {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
}

interface EditCurrencyForm {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
}

interface ExchangeRate {
  id: string;
  fromCurrencyId: string;
  toCurrencyId: string;
  rate: number;
  fromCurrency: Currency;
  toCurrency: Currency;
  createdAt: string;
  updatedAt: string;
}

interface CreateRateForm {
  fromCurrencyId: string;
  toCurrencyId: string;
  rate: number;
}

interface EditRateForm {
  rate: number;
}

export default function CurrenciesPage() {
  const { user } = useAuth();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [showEditRateModal, setShowEditRateModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [selectedRate, setSelectedRate] = useState<ExchangeRate | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<'currencies' | 'rates'>('currencies');
  const [createForm, setCreateForm] = useState<CreateCurrencyForm>({
    code: "",
    name: "",
    symbol: "",
    decimalPlaces: 2,
  });
  const [editForm, setEditForm] = useState<EditCurrencyForm>({
    code: "",
    name: "",
    symbol: "",
    decimalPlaces: 2,
  });
  const [rateForm, setRateForm] = useState<CreateRateForm>({
    fromCurrencyId: "",
    toCurrencyId: "",
    rate: 1,
  });
  const [editRateForm, setEditRateForm] = useState<EditRateForm>({
    rate: 1,
  });

  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/currencies");
      if (!response.ok) {
        throw new Error(response.error || "Failed to fetch currencies");
      }
      const data = response.data;
      setCurrencies(data.currencies);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load currencies");
    } finally {
      setLoading(false);
    }
  };

  const fetchExchangeRates = async () => {
    try {
      console.log("Fetching exchange rates...");
      const response = await api.get("/api/exchange-rates");
      if (!response.ok) {
        throw new Error(response.error || "Failed to fetch exchange rates");
      }
      const data = response.data;
      console.log("Exchange rates response:", data);
      setExchangeRates(data.exchangeRates || []);
    } catch (err) {
      console.error("Failed to load exchange rates:", err);
    }
  };

  useEffect(() => {
    fetchCurrencies();
    fetchExchangeRates();
  }, []);

  const handleCreateCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post("/api/currencies", createForm);

      if (!response.ok) {
        throw new Error(response.error || "Failed to create currency");
      }

      setShowCreateModal(false);
      setCreateForm({ code: "", name: "", symbol: "", decimalPlaces: 2 });
      fetchCurrencies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create currency");
    }
  };

  const handleEditCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCurrency) return;
    
    try {
      const response = await api.put(`/api/currencies/${selectedCurrency.id}`, editForm);

      if (!response.ok) {
        throw new Error(response.error || "Failed to update currency");
      }

      setShowEditModal(false);
      setSelectedCurrency(null);
      setEditForm({ code: "", name: "", symbol: "", decimalPlaces: 2 });
      fetchCurrencies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update currency");
    }
  };

  const handleCreateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that rate is not NaN and is positive
    if (isNaN(rateForm.rate) || rateForm.rate <= 0) {
      setError("Please enter a valid positive exchange rate");
      return;
    }

    // Validate that from and to currencies are different
    if (rateForm.fromCurrencyId === rateForm.toCurrencyId) {
      setError("From and To currencies must be different");
      return;
    }

    try {
      const payload = {
        fromCurrencyId: rateForm.fromCurrencyId,
        toCurrencyId: rateForm.toCurrencyId,
        rate: Number(rateForm.rate), // Ensure it's a proper number
      };

      console.log("Creating exchange rate with payload:", payload);

      const response = await api.post("/api/exchange-rates", payload);

      if (!response.ok) {
        throw new Error(response.error || "Failed to create exchange rate");
      }

      setShowRateModal(false);
      setRateForm({ fromCurrencyId: "", toCurrencyId: "", rate: 1 });
      setError(null); // Clear any previous errors
      await fetchExchangeRates(); // Wait for the fetch to complete
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create exchange rate");
    }
  };

  const openEditModal = (currency: Currency) => {
    setSelectedCurrency(currency);
    setEditForm({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      decimalPlaces: currency.decimalPlaces,
    });
    setShowEditModal(true);
  };

  const openEditRateModal = (rate: ExchangeRate) => {
    setSelectedRate(rate);
    setEditRateForm({
      rate: rate.rate,
    });
    setShowEditRateModal(true);
  };

  const handleEditRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRate) return;
    
    // Validate that rate is not NaN and is positive
    if (isNaN(editRateForm.rate) || editRateForm.rate <= 0) {
      setError("Please enter a valid positive exchange rate");
      return;
    }

    try {
      const payload = {
        rate: Number(editRateForm.rate),
      };

      const response = await api.put(`/api/exchange-rates/${selectedRate.id}`, payload);

      if (!response.ok) {
        throw new Error(response.error || "Failed to update exchange rate");
      }

      setShowEditRateModal(false);
      setSelectedRate(null);
      setEditRateForm({ rate: 1 });
      setError(null);
      await fetchExchangeRates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update exchange rate");
    }
  };

  const handleDeleteRate = async (rateId: string) => {
    if (!confirm("Are you sure you want to delete this exchange rate?")) {
      return;
    }

    try {
      const response = await api.delete(`/api/exchange-rates/${rateId}`);

      if (!response.ok) {
        throw new Error(response.error || "Failed to delete exchange rate");
      }

      await fetchExchangeRates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete exchange rate");
    }
  };

  const filteredCurrencies = currencies.filter((currency) =>
    currency.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    currency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    currency.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRates = exchangeRates.filter((rate) =>
    rate.fromCurrency.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rate.toCurrency.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Currencies & Exchange Rates</h1>
          <p className="text-gray-400">Manage supported currencies and exchange rates</p>
        </div>
        <div className="flex gap-2">
          {user?.role === "ADMIN" && (
            <>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors"
              >
                Add Currency
              </button>
              <button
                onClick={() => {
                  setRateForm({ fromCurrencyId: "", toCurrencyId: "", rate: 1 });
                  setError(null);
                  setShowRateModal(true);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Add Exchange Rate
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-black border border-gray-700 rounded-lg p-4">
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setActiveTab('currencies')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'currencies'
                ? 'bg-[#f08c17] text-black'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Currencies
          </button>
          <button
            onClick={() => setActiveTab('rates')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'rates'
                ? 'bg-[#f08c17] text-black'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Exchange Rates
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#f08c17] focus:border-transparent"
        />
      </div>

      {/* Currencies Tab */}
      {activeTab === 'currencies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCurrencies.map((currency) => (
            <div key={currency.id} className="bg-black border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{currency.code}</h3>
                  <p className="text-gray-400">{currency.name}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  currency.isActive ? "bg-green-900/20 text-green-300" : "bg-red-900/20 text-red-300"
                }`}>
                  {currency.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Symbol:</span>
                  <span className="text-white">{currency.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Decimal Places:</span>
                  <span className="text-white">{currency.decimalPlaces}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Created:</span>
                  <span className="text-white">{new Date(currency.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {user?.role === "ADMIN" && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <button 
                    onClick={() => openEditModal(currency)}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    Edit Currency
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Exchange Rates Tab */}
      {activeTab === 'rates' && (
        <div className="bg-black border border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    From Currency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    To Currency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Exchange Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Last Updated
                  </th>
                  {user?.role === "ADMIN" && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredRates.map((rate) => (
                  <tr key={rate.id} className="hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-white font-medium">{rate.fromCurrency.code}</span>
                        <span className="text-gray-400 ml-2">({rate.fromCurrency.symbol})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-white font-medium">{rate.toCurrency.code}</span>
                        <span className="text-gray-400 ml-2">({rate.toCurrency.symbol})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-white font-mono">{rate.rate.toFixed(6)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {new Date(rate.updatedAt).toLocaleDateString()}
                    </td>
                    {user?.role === "ADMIN" && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => openEditRateModal(rate)}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteRate(rate.id)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredRates.length === 0 && (
                  <tr>
                    <td colSpan={user?.role === "ADMIN" ? 5 : 4} className="px-6 py-4 text-center text-gray-400">
                      No exchange rates found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Currency Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Add Currency</h2>
            <form onSubmit={handleCreateCurrency} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Currency Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={3}
                  value={createForm.code}
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                  className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#f08c17] focus:border-transparent"
                  placeholder="e.g., USD"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Currency Name
                </label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#f08c17] focus:border-transparent"
                  placeholder="e.g., US Dollar"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Symbol
                </label>
                <input
                  type="text"
                  required
                  value={createForm.symbol}
                  onChange={(e) => setCreateForm({ ...createForm, symbol: e.target.value })}
                  className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#f08c17] focus:border-transparent"
                  placeholder="e.g., $"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Decimal Places
                </label>
                <select
                  value={createForm.decimalPlaces}
                  onChange={(e) => setCreateForm({ ...createForm, decimalPlaces: parseInt(e.target.value) })}
                  className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#f08c17] focus:border-transparent"
                >
                  <option value={0}>0</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors"
                >
                  Create Currency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Currency Modal */}
      {showEditModal && selectedCurrency && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Edit Currency</h2>
            <form onSubmit={handleEditCurrency} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Currency Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={3}
                  value={editForm.code}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                  className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#f08c17] focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Currency Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#f08c17] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Symbol
                </label>
                <input
                  type="text"
                  required
                  value={editForm.symbol}
                  onChange={(e) => setEditForm({ ...editForm, symbol: e.target.value })}
                  className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#f08c17] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Decimal Places
                </label>
                <select
                  value={editForm.decimalPlaces}
                  onChange={(e) => setEditForm({ ...editForm, decimalPlaces: parseInt(e.target.value) })}
                  className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#f08c17] focus:border-transparent"
                >
                  <option value={0}>0</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#f08c17] text-black px-4 py-2 rounded-lg font-medium hover:bg-orange-500 transition-colors"
                >
                  Update Currency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Exchange Rate Modal */}
      {showRateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Add Exchange Rate</h2>
            
            {error && (
              <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            <form onSubmit={handleCreateRate} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  From Currency
                </label>
                <select
                  required
                  value={rateForm.fromCurrencyId}
                  onChange={(e) => setRateForm({ ...rateForm, fromCurrencyId: e.target.value })}
                  className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#f08c17] focus:border-transparent"
                >
                  <option value="">Select currency</option>
                  {currencies.map((currency) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.code} - {currency.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  To Currency
                </label>
                <select
                  required
                  value={rateForm.toCurrencyId}
                  onChange={(e) => setRateForm({ ...rateForm, toCurrencyId: e.target.value })}
                  className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-[#f08c17] focus:border-transparent"
                >
                  <option value="">Select currency</option>
                  {currencies.map((currency) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.code} - {currency.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Exchange Rate
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="0.000001"
                  required
                  value={rateForm.rate}
                  onChange={(e) => {
                    const value = e.target.value;
                    const numValue = value === "" ? 1 : parseFloat(value);
                    if (!isNaN(numValue) && numValue > 0) {
                      setRateForm({ ...rateForm, rate: numValue });
                    }
                  }}
                  className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#f08c17] focus:border-transparent"
                  placeholder="e.g., 1.25"
                />
                <p className="text-xs text-gray-400 mt-1">
                  How many {currencies.find(c => c.id === rateForm.toCurrencyId)?.code || "target"} units = 1 {currencies.find(c => c.id === rateForm.fromCurrencyId)?.code || "source"} unit
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRateModal(false);
                    setError(null);
                    setRateForm({ fromCurrencyId: "", toCurrencyId: "", rate: 1 });
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!rateForm.fromCurrencyId || !rateForm.toCurrencyId || rateForm.rate <= 0}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Exchange Rate Modal */}
      {showEditRateModal && selectedRate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Edit Exchange Rate</h2>
            
            {error && (
              <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            <form onSubmit={handleEditRate} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  From Currency
                </label>
                <div className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-400">
                  {selectedRate.fromCurrency.code} - {selectedRate.fromCurrency.name}
                </div>
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  To Currency
                </label>
                <div className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-400">
                  {selectedRate.toCurrency.code} - {selectedRate.toCurrency.name}
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">
                  Exchange Rate
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="0.000001"
                  required
                  value={editRateForm.rate}
                  onChange={(e) => {
                    const value = e.target.value;
                    const numValue = value === "" ? 1 : parseFloat(value);
                    if (!isNaN(numValue) && numValue > 0) {
                      setEditRateForm({ rate: numValue });
                    }
                  }}
                  className="w-full bg-black border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#f08c17] focus:border-transparent"
                  placeholder="e.g., 1.25"
                />
                <p className="text-xs text-gray-400 mt-1">
                  How many {selectedRate.toCurrency.code} units = 1 {selectedRate.fromCurrency.code} unit
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditRateModal(false);
                    setSelectedRate(null);
                    setError(null);
                    setEditRateForm({ rate: 1 });
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editRateForm.rate <= 0}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}