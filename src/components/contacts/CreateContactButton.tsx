'use client';

import { useState } from 'react';
import CreateContactModal from './CreateContactModal';

export default function CreateContactButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <button
        onClick={openModal}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
      >
        <span className="mr-1">+</span> Create Contact
      </button>
      
      <CreateContactModal isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
}
