import { Transaction, DueReminder } from '../types';

export const calculateDueReminders = (transactions: Transaction[]): DueReminder[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pendingBills = transactions.filter(
    (t) => (t.type === 'falta_pagar' || (t.type === 'saida' && t.status === 'pendente')) && t.dueDate
  );

  return pendingBills
    .map((t) => {
      const [year, month, day] = (t.dueDate || '').split('-').map(Number);
      const due = new Date(year, month - 1, day);
      due.setHours(0, 0, 0, 0);

      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status: DueReminder['status'] = 'normal';
      if (diffDays < 0) {
        status = 'vencido';
      } else if (diffDays === 0) {
        status = 'vence_hoje';
      } else if (diffDays <= 3) {
        status = 'vence_em_breve';
      }

      return {
        id: `reminder-${t.id}`,
        transactionId: t.id,
        description: t.description,
        amount: t.amount,
        dueDate: t.dueDate || '',
        daysRemaining: diffDays,
        status,
        category: t.category,
        memberId: t.memberId,
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
};

// Play a synthesized chime using browser Web Audio API
export const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Two-tone chime: 587.33Hz (D5) -> 880Hz (A5)
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (e) {
    console.debug('Audio notification error (non-fatal):', e);
  }
};

export const requestPushPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    return false;
  }
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (e) {
    console.error('Error requesting notification permission:', e);
    return false;
  }
};

export const sendPushNotification = (title: string, options?: NotificationOptions): boolean => {
  playNotificationSound();

  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
      return true;
    } catch (e) {
      console.error('Push notification send error:', e);
      return false;
    }
  }
  return false;
};
