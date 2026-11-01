export function notificationReason(best, previousPrice, thresholdEur) {
  if (!best) return null;
  if (previousPrice === null || previousPrice === undefined) {
    return best.amount <= thresholdEur ? 'First fare at or below your target' : null;
  }
  if (best.amount < previousPrice) return 'New lowest observed fare';
  return null;
}

export function telegramMessage(best, reason) {
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone:'Europe/Budapest', dateStyle:'medium', timeStyle:'short'
  }).format(new Date(best.departure));
  return `🚆 Budapest → Vienna train fare\n${reason}: €${best.amount.toFixed(2)}\n${best.from} → ${best.to}\nDeparts: ${time}\nVerify / book: ${best.bookingUrl}\n\nMÁV quote via unofficial interface; verify extras and availability at checkout.`;
}

export async function sendTelegram(best, reason) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId || !best || !reason) return false;
  const url = `https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`;
  const response = await fetch(url, {
    method:'POST', headers:{'content-type':'application/json'},
    body:JSON.stringify({chat_id:chatId, text:telegramMessage(best,reason), disable_web_page_preview:true}),
    signal:AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Telegram delivery failed with HTTP ${response.status}`);
  const result = await response.json();
  if (!result?.ok) throw new Error('Telegram rejected the message');
  return true;
}
