'use client';

import { MainLayout } from '@/components/layout';
import { Card, Button, Avatar } from '@/components/common';
import { LogOut, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function LogoutPage() {
  return (
    <MainLayout showSidebar={false} showRightPanel={false} showBottomNav={false}>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-dark mb-2">
            Logged Out Successfully
          </h1>
          <p className="text-gray-500 mb-6">
            Your wallet has been disconnected. Thank you for using Metabased!
          </p>

          <div className="space-y-3">
            <Link href="/login" className="block">
              <Button variant="primary" className="w-full">
                Connect Wallet Again
              </Button>
            </Link>
            <Link href="/home" className="block">
              <Button variant="outline" className="w-full">
                Back to Home
              </Button>
            </Link>
          </div>

          <p className="text-xs text-gray-400 mt-6">
            Your data remains secure on the blockchain
          </p>
        </Card>
      </div>
    </MainLayout>
  );
}
