'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';

const TOUR_KEY = 'plinth_tour_dashboard_v1_done';
const MAX_WAIT_ATTEMPTS = 10;
const WAIT_INTERVAL_MS = 300;
const KICKOFF_DELAY_MS = 500;

const STEPS: DriveStep[] = [
  {
    popover: {
      title: 'Welcome to Plinth',
      description: "Let's take a 60-second look around your dashboard.",
    },
  },
  {
    element: '[data-tour="nav-item-overview"]',
    popover: {
      title: 'Your command center',
      description: 'Revenue, at-risk subscriptions, and recent activity — all in one place.',
      side: 'right',
    },
  },
  {
    element: '[data-tour="mrr-panel"]',
    popover: {
      title: 'Monthly recurring revenue',
      description: 'Updates live as subscriptions activate, renew, or churn.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="attention-card"]',
    popover: {
      title: 'Needs attention',
      description:
        'Past-due, delinquent, and grace-period subscriptions surface here first, so nothing slips through.',
      side: 'left',
    },
  },
  {
    element: '[data-tour="quickstart-card"]',
    popover: {
      title: 'Your API key, right here',
      description: 'A demo key and your first three API calls, whenever you need a reference.',
      side: 'top',
    },
  },
  {
    element: '[data-tour="nav-item-subscriptions"]',
    popover: {
      title: 'Subscriptions & billing',
      description: 'Manage plans, subscriptions, invoices, and dunning from the Money section.',
      side: 'right',
    },
  },
  {
    element: '[data-tour="nav-item-webhooks"]',
    popover: {
      title: 'Webhooks',
      description: 'Get notified the moment a payment succeeds, fails, or a subscription changes state.',
      side: 'right',
    },
  },
  {
    element: '[data-tour="nav-item-settings"]',
    popover: {
      title: 'Settings',
      description: 'Manage real API keys, notification preferences, and your account.',
      side: 'right',
    },
  },
];

/**
 * First-run spotlight tour over the real dashboard — no separate takeover
 * page. Only ever auto-starts on /dashboard (where every target lives),
 * matching where the onboarding it replaces used to show.
 */
export function DashboardTour() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/dashboard') return;
    if (localStorage.getItem(TOUR_KEY) === 'true') return;

    let cancelled = false;
    let attempts = 0;
    let waitTimer: ReturnType<typeof setTimeout>;

    function startTour() {
      if (cancelled) return;
      const steps = STEPS.filter(
        (step) => !step.element || document.querySelector(step.element as string),
      );
      // Only the welcome step ever mounted (nav failed to render at all) — bail.
      if (steps.length <= 1) return;

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const tour = driver({
        showProgress: true,
        animate: !reduced,
        overlayOpacity: 0.65,
        stagePadding: 6,
        stageRadius: 8,
        allowClose: true,
        popoverClass: 'plinth-tour-popover',
        steps,
        // Confirmed via manual testing that calling driver.destroy() from a
        // custom onCloseClick/onDoneClick does NOT chain into onDestroyed —
        // so persistence is set directly in each handler rather than relying
        // on that hook. onDestroyed stays wired too as a defensive fallback
        // for any other dismissal path (Escape key, overlay click).
        onCloseClick: (_el, _step, opts) => {
          localStorage.setItem(TOUR_KEY, 'true');
          opts.driver.destroy();
        },
        onDoneClick: (_el, _step, opts) => {
          localStorage.setItem(TOUR_KEY, 'true');
          opts.driver.destroy();
        },
        onDestroyed: () => localStorage.setItem(TOUR_KEY, 'true'),
      });
      tour.drive();
    }

    // The overview's snapshot fetch + stagger-in animation means real cards
    // (mrr-panel, attention-card) may not exist yet on mount — wait for them,
    // bounded, then start regardless so a slow/failed fetch still gets a
    // (shorter) nav-only tour instead of never running at all.
    function waitForContent() {
      if (cancelled) return;
      attempts += 1;
      const ready = document.querySelector('[data-tour="mrr-panel"]');
      if (!ready && attempts < MAX_WAIT_ATTEMPTS) {
        waitTimer = setTimeout(waitForContent, WAIT_INTERVAL_MS);
        return;
      }
      startTour();
    }

    const kickoff = setTimeout(waitForContent, KICKOFF_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(kickoff);
      clearTimeout(waitTimer);
    };
  }, [pathname]);

  return null;
}
