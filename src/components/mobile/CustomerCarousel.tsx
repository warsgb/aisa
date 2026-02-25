import { useState } from 'react';
import { ChevronLeft, ChevronRight, Building2, User } from 'lucide-react';
import { useCurrentCustomerStore } from '../../stores/currentCustomer.store';
import { useMobileTabStore } from '../../stores/mobileTab.store';
import type { Customer } from '../../types';

interface CustomerCarouselProps {
  customers: Customer[];
}

/**
 * Customer carousel for mobile workspace
 * Blue gradient background with left/right navigation arrows
 */
export function CustomerCarousel({ customers }: CustomerCarouselProps) {
  const { currentCustomer, setCurrentCustomer } = useCurrentCustomerStore();
  const { setActiveTab } = useMobileTabStore();
  const [currentIndex, setCurrentIndex] = useState(0);

  const filteredCustomers = customers.length > 0 ? customers : [];
  const hasCustomers = filteredCustomers.length > 0;
  const displayCustomer = currentCustomer || (hasCustomers ? filteredCustomers[0] : null);

  const handlePrevious = () => {
    if (!hasCustomers) return;
    const newIndex = currentIndex > 0 ? currentIndex - 1 : filteredCustomers.length - 1;
    setCurrentIndex(newIndex);
    setCurrentCustomer(filteredCustomers[newIndex]);
  };

  const handleNext = () => {
    if (!hasCustomers) return;
    const newIndex = currentIndex < filteredCustomers.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    setCurrentCustomer(filteredCustomers[newIndex]);
  };

  const handleManageCustomers = () => {
    setActiveTab('customers');
  };

  return (
    <div className="relative bg-gradient-to-br from-[#1677FF] to-[#0EA5E9] rounded-2xl p-5 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-lg font-semibold">当前客户</h2>
        {hasCustomers && (
          <div className="flex items-center gap-1 text-white/80 text-sm">
            <span>{currentIndex + 1}</span>
            <span>/</span>
            <span>{filteredCustomers.length}</span>
          </div>
        )}
      </div>

      {/* Customer Card */}
      {displayCustomer ? (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 min-h-[100px] flex items-center justify-center">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-white" />
              <h3 className="text-white text-xl font-bold">{displayCustomer.name}</h3>
            </div>
            {displayCustomer.industry && (
              <p className="text-white/80 text-sm">{displayCustomer.industry}</p>
            )}
            {displayCustomer.company_size && (
              <p className="text-white/60 text-xs mt-1">{displayCustomer.company_size}</p>
            )}
          </div>
        </div>
      ) : (
        <div
          className="bg-white/10 backdrop-blur-sm rounded-xl p-4 min-h-[100px] flex items-center justify-center cursor-pointer"
          onClick={handleManageCustomers}
        >
          <div className="text-center">
            <User className="w-8 h-8 text-white/80 mx-auto mb-2" />
            <p className="text-white text-sm">点击选择客户</p>
            <p className="text-white/60 text-xs mt-1">或前往客户管理</p>
          </div>
        </div>
      )}

      {/* Navigation Arrows */}
      {hasCustomers && filteredCustomers.length > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={handlePrevious}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
            aria-label="上一个客户"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={handleManageCustomers}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full text-white text-sm transition-colors"
          >
            管理客户
          </button>
          <button
            onClick={handleNext}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
            aria-label="下一个客户"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      {!hasCustomers && (
        <div className="flex justify-center mt-4">
          <button
            onClick={handleManageCustomers}
            className="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-full text-white text-sm transition-colors"
          >
            添加客户
          </button>
        </div>
      )}
    </div>
  );
}
