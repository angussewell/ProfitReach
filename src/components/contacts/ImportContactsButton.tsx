'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ImportContactsModal from './ImportContactsModal';

export default function ImportContactsButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <Button
        variant="outline"
        size="default"
        onClick={openModal}
      >
        <span className="mr-1">+</span> Import Contacts
      </Button>
      
      <ImportContactsModal isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
}
