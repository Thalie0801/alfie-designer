import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

interface AppLayoutWithSidebarProps {
  children: ReactNode;
}

export function AppLayoutWithSidebar({ children }: AppLayoutWithSidebarProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header avec trigger pour mobile */}
          <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-card/70 backdrop-blur px-4 py-3 lg:hidden">
            <SidebarTrigger />
            <h1 className="font-semibold">Alfie Designer</h1>
          </header>

          {/* Trigger pour desktop (toujours visible) */}
          <div className="hidden lg:block p-2">
            <SidebarTrigger />
          </div>

          {/* Contenu principal */}
          <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
