'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import CreateContactModal from './CreateContactModal';

export default function CreateContactButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <Button
        variant="default"
        size="default"
        onClick={openModal}
      >
        <span className="mr-1">+</span> Create Contact
      </Button>
      
      <CreateContactModal isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
}
