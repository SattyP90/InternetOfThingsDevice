const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN
const CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID

export async function sendTelegramMessage(message) {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message
        })
      }
    )

    const data = await response.json()

    console.log('Telegram response:', data)

    return response.ok
  } catch (error) {
    console.error(error)
    return false
  }
}
