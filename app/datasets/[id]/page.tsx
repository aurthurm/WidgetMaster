import React from 'react';
import { Metadata } from 'next';
import { AppLayout } from '@/components/layout/app-layout';
import { DatasetDetailClient } from './client-page';

export const metadata: Metadata = {
  title: 'Dataset Details - BeakDash',
  description: 'View and manage dataset details',
};

export default async function DatasetDetailPage({ params }: { params: { id: string } }) {
  // In Next.js 15, we need to await params before using them
  const datasetId = params?.id || "";
  
  return (
    <AppLayout>
      <div className="container px-4 py-6">
        <DatasetDetailClient id={datasetId} />
      </div>
    </AppLayout>
  );
}