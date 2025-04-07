'use client';

import { useState } from 'react';
import ImportContactsModal from './ImportContactsModal';

export default function ImportContactsButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <button
        onClick={openModal}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
      >
        <span className="mr-1">+</span> Import Contacts
      </button>
      
      <ImportContactsModal isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
}
