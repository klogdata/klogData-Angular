import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  ArrowRight, BarChart, Building2, Calculator, CheckCircle2, ChevronDown, ChevronRight,
  CircleAlert, CircleCheck, Cpu, Database, Github, LayoutDashboard, Linkedin, Lock,
  Mail, Menu, Network, Phone, Rocket, ShieldCheck, Users, X, Zap,
  LucideIconProvider, LUCIDE_ICONS,
} from 'lucide-angular';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({
        ArrowRight, BarChart, Building2, Calculator, CheckCircle2, ChevronDown, ChevronRight,
        CircleAlert, CircleCheck, Cpu, Database, Github, LayoutDashboard, Linkedin, Lock,
        Mail, Menu, Network, Phone, Rocket, ShieldCheck, Users, X, Zap,
      }),
    },
  ],
};
