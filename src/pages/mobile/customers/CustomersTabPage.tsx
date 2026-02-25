import { useEffect, useState } from 'react';
import { Search, Building2, ChevronRight, Check } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useCurrentCustomerStore } from '../../../stores/currentCustomer.store';
import { useMobileTabStore } from '../../../stores/mobileTab.store';
import { apiService } from '../../../services/api.service';
import type { Customer } from '../../../types';

/**
 * Customers Tab Page - Mobile customer list with search
 * Shows all customers with highlighting for current selection
 */
export function CustomersTabPage() {
  const { team } = useAuth();
  const { currentCustomer, setCurrentCustomer } = useCurrentCustomerStore();
  const { setActiveTab } = useMobileTabStore();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load customers
  useEffect(() => {
    const loadCustomers = async () => {
      if (!team) return;
      setIsLoading(true);
      try {
        const data = await apiService.getCustomers(team.id);
        setCustomers(data);
      } catch (error) {
        console.error('Failed to load customers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomers();
  }, [team]);

  // Filter customers by search query
  const filteredCustomers = customers.filter((customer) => {
    const query = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.industry?.toLowerCase().includes(query) ||
      customer.description?.toLowerCase().includes(query)
    );
  });

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer) => {
    setCurrentCustomer(customer);
    setActiveTab('workspace');
  };

  return (
    <div className="px-4 py-2">
      {/* Header */}
      <h2 className="text-xl font-bold text-gray-900 mb-4">客户管��</h2>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索客户名称、行业..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1677FF] focus:border-transparent text-sm"
        />
      </div>

      {/* Customer List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">加载中...</div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {searchQuery ? '没有找到匹配的客户' : '暂无客户'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((customer) => {
            const isSelected = currentCustomer?.id === customer.id;

            return (
              <button
                key={customer.id}
                onClick={() => handleCustomerSelect(customer)}
                className={`
                  w-full bg-white rounded-xl p-4 border-2 transition-all duration-200
                  flex items-center gap-3 text-left
                  ${
                    isSelected
                      ? 'border-[#1677FF] bg-[#1677FF]/5 shadow-sm'
                      : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                  }
                `}
              >
                {/* Icon */}
                <div
                  className={`
                    w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                    ${isSelected ? 'bg-[#1677FF]' : 'bg-gray-100'}
                  `}
                >
                  <Building2 className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`font-semibold truncate ${
                        isSelected ? 'text-[#1677FF]' : 'text-gray-900'
                      }`}
                    >
                      {customer.name}
                    </h3>
                    {isSelected && <Check className="w-4 h-4 text-[#1677FF] shrink-0" />}
                  </div>
                  {customer.industry && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{customer.industry}</p>
                  )}
                  {customer.company_size && (
                    <p className="text-xs text-gray-400 truncate">{customer.company_size}</p>
                  )}
                </div>

                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* Add Customer Button (placeholder) */}
      <button className="w-full mt-4 py-3 bg-[#1677FF] hover:bg-[#1677FF]/90 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
        <span>+</span>
        <span>添加新客户</span>
      </button>
    </div>
  );
}
