'use client';

import React from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { QueryProvider } from './providers/query-provider';
import { WebSocketProvider } from './providers/websocket-provider';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        layout: {
          showOptionalFields: true,
          socialButtonsVariant: "iconButton",
          socialButtonsPlacement: "bottom"
        },
        elements: {
          formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
          card: 'shadow-md',
          headerTitle: 'text-2xl font-bold',
          headerSubtitle: 'text-sm text-muted-foreground'
        }
      }}
    >
      <QueryProvider>
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      </QueryProvider>
    </ClerkProvider>
  );
}