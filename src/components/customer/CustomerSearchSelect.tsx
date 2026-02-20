import { useState, useRef, useEffect } from 'react';
import { useCurrentCustomerStore } from '../../stores';
import type { Customer } from '../../types';

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
          w-full flex items-center justify-between px-4 py-2.5
          bg-white border rounded-lg text-left
          transition-colors duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-[#1677FF] cursor-pointer'}
          ${isOpen ? 'border-[#1677FF] ring-2 ring-[#1677FF]/20' : 'border-gray-300'}
        `}
        style={{ borderRadius: '8px' }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-gray-500 shrink-0">👤</span>
          <span className={`truncate ${currentCustomer ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
            {currentCustomer ? `当前客户：${currentCustomer.name}` : '请选择客户'}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {currentCustomer && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
          <span className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
          style={{ borderRadius: '8px' }}
        >
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索客户名称或行业..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-[#1677FF] focus:ring-1 focus:ring-[#1677FF]"
              />
            </div>
          </div>

          {/* Customer list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                {searchTerm ? '未找到匹配的客户' : '暂无客户数据'}
              </div>
            ) : (
              <ul className="py-1">
                {filteredCustomers.map((customer) => (
                  <li key={customer.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(customer)}
                      className={`
                        w-full px-4 py-2.5 text-left flex items-center gap-3
                        hover:bg-[#F5F7FA] transition-colors duration-150
                        ${currentCustomer?.id === customer.id ? 'bg-[#1677FF]/5 text-[#1677FF]' : 'text-gray-700'}
                      `}
                    >
                      <span className="text-lg">🏢</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{customer.name}</div>
                        {customer.industry && (
                          <div className="text-xs text-gray-400 truncate">{customer.industry}</div>
                        )}
                      </div>
                      {currentCustomer?.id === customer.id && (
                        <span className="text-[#1677FF] shrink-0">✓</span>
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
