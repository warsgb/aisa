import { useState, useRef, useEffect } from 'react';
import { useCurrentCustomerStore } from '../../stores';
import type { Customer } from '../../types';
import { Search, X, ChevronDown, Building2 } from 'lucide-react';

interface CustomerSearchSelectProps {
  customers: Customer[];
  onSelect: (customer: Customer | null) => void;
  disabled?: boolean;
}

export function CustomerSearchSelect({ customers, onSelect, disabled }: CustomerSearchSelectProps) {
  const { currentCustomer } = useCurrentCustomerStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Filter customers based on search term
  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.industry && customer.industry.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (customer: Customer | null) => {
    onSelect(customer);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleSelect(null);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between px-4 py-3
          bg-white border-2 rounded-2xl text-left
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-primary/30 cursor-pointer'}
          ${isOpen ? 'border-primary ring-2 ring-primary/20 shadow-sm' : 'border-gray-200 hover:border-gray-300'}
        `}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${currentCustomer ? 'bg-primary/10' : 'bg-gray-100'}`}>
            {currentCustomer ? (
              <Building2 className="w-5 h-5 text-primary" />
            ) : (
              <Search className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div className="flex flex-col">
            <span className={`text-sm ${currentCustomer ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
              {currentCustomer ? currentCustomer.name : '选择客户'}
            </span>
            {currentCustomer?.industry && (
              <span className="text-xs text-gray-500">{currentCustomer.industry}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {currentCustomer && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
        >
          {/* Search input */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索客户名称或行业..."
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-background border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Customer list */}
          <div className="max-h-64 overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="px-4 py-8 text-sm text-gray-500 text-center">
                <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>{searchTerm ? '未找到匹配的客户' : '暂无客户数据'}</p>
              </div>
            ) : (
              <ul className="py-1">
                {filteredCustomers.map((customer) => (
                  <li key={customer.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(customer)}
                      className={`
                        w-full px-4 py-3 text-left flex items-center gap-3
                        hover:bg-background transition-colors duration-150
                        ${currentCustomer?.id === customer.id ? 'bg-primary/5 text-primary' : 'text-gray-700'}
                      `}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${currentCustomer?.id === customer.id ? 'bg-primary/10' : 'bg-gray-100'}`}>
                        <Building2 className={`w-5 h-5 ${currentCustomer?.id === customer.id ? 'text-primary' : 'text-gray-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{customer.name}</div>
                        {customer.industry && (
                          <div className="text-xs text-gray-400 truncate">{customer.industry}</div>
                        )}
                      </div>
                      {currentCustomer?.id === customer.id && (
                        <svg className="w-5 h-5 text-primary shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
