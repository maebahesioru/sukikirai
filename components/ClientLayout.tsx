'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import TermsAgreementModal from './TermsAgreementModal';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user has agreed to terms
    const userToken = Cookies.get('user_token');
    if (!userToken) {
      setShowTermsModal(true);
    }
    setIsChecking(false);
  }, []);

  const handleAgree = () => {
    setShowTermsModal(false);
  };

  // Show loading or nothing while checking
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showTermsModal && <TermsAgreementModal onAgree={handleAgree} />}
      {children}
    </>
  );
}
