import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Customer } from '../../types';
import { Search, X, ChevronDown, Building2 } from 'lucide-react';

interface CustomerSearchSelectProps {
  customers: Customer[];
  onSelect: (customer: Customer | null) => void;
  disabled?: boolean;
  value?: Customer | null; // 添加 value prop 来接收当前选中的客户
}

export function CustomerSearchSelect({ customers, onSelect, disabled, value }: CustomerSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Check if click is outside the container AND outside any portal dropdown
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(event.target as Node);
      // Find the dropdown portal by checking if clicked element is inside a fixed positioned dropdown
      const clickedElement = event.target as Node;
      const isInsideDropdown = (clickedElement as HTMLElement).closest?.('.fixed.z-\\[100\\]') !== null;

      if (isOutsideContainer && !isInsideDropdown) {
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

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    } else {
      setDropdownPosition(null);
    }
  }, [isOpen]);

  // Filter customers based on search term
  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.industry && customer.industry.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (customer: Customer | null) => {
    console.log('[CustomerSearchSelect] handleSelect called with:', customer);
    onSelect(customer);
    // Small delay to ensure onSelect completes before closing
    setTimeout(() => {
      setIsOpen(false);
      setSearchTerm('');
    }, 0);
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
          w-full flex items-center justify-between px-4 py-3.5 sm:py-3
          bg-white border-2 rounded-2xl text-left min-h-[48px]
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-primary/30 cursor-pointer'}
          ${isOpen ? 'border-primary ring-2 ring-primary/20 shadow-sm' : 'border-gray-200 hover:border-gray-300'}
        `}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${value ? 'bg-primary/10' : 'bg-gray-100'}`}>
            {value ? (
              <Building2 className="w-5 h-5 text-primary" />
            ) : (
              <Search className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div className="flex flex-col">
            <span className={`text-sm ${value ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
              {value ? value.name : '选择客户'}
            </span>
            {value?.industry && (
              <span className="text-xs text-gray-500">{value.industry}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {value && (
            <div
              onClick={handleClear}
              className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </div>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && dropdownPosition && createPortal(
        <div
          className="fixed z-[100] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-[60vh]"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
        >
          {/* Search input */}
          <div className="p-3 sm:p-3 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-4 sm:h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索客户名称或行业..."
                className="w-full pl-10 pr-3 py-3 sm:py-2.5 text-sm bg-background border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                        w-full px-4 py-3.5 sm:py-3 text-left flex items-center gap-3 min-h-[52px]
                        hover:bg-background transition-colors duration-150 active:scale-[0.98]
                        ${value?.id === customer.id ? 'bg-primary/5 text-primary' : 'text-gray-700'}
                      `}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${value?.id === customer.id ? 'bg-primary/10' : 'bg-gray-100'}`}>
                        <Building2 className={`w-5 h-5 ${value?.id === customer.id ? 'text-primary' : 'text-gray-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{customer.name}</div>
                        {customer.industry && (
                          <div className="text-xs text-gray-400 truncate">{customer.industry}</div>
                        )}
                      </div>
                      {value?.id === customer.id && (
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
        </div>,
        document.body
      )}
    </div>
  );
}
