const appId = '3466374920204212';
const appSecret = 'c5fc72f91d376f18f8b2b48d1e4786a4';
const appToken = `${appId}|${appSecret}`;

async function main() {
  console.log('Using App Access Token to inspect App Webhooks...');
  const res = await fetch(`https://graph.facebook.com/v21.0/${appId}/subscriptions?access_token=${appToken}`);
  const data = await res.json();
  console.log('Subscriptions:', JSON.stringify(data, null, 2));

  // If callback_url is not pointing to our Vercel domain, or if fields do not include messages:
  const callbackUrl = 'https://meta.rasaproductions.in/api/whatsapp/webhook';
  const verifyToken = 'rasa_meta_verify_2026';

  console.log('Updating Webhook Subscription on Meta to:', callbackUrl);
  const updateRes = await fetch(`https://graph.facebook.com/v21.0/${appId}/subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${appToken}`
    },
    body: JSON.stringify({
      object: 'whatsapp_business_account',
      callback_url: callbackUrl,
      verify_token: verifyToken,
      fields: [
        'messages',
        'message_template_status_update',
        'message_template_quality_update',
        'flows',
        'phone_number_name_update',
        'phone_number_quality_update',
        'account_alerts',
        'account_update',
        'business_capability_update',
        'message_echoes'
      ],
      include_values: true
    })
  });
  const updateData = await updateRes.json();
  console.log('Update subscription result:', updateData);

  // Check again
  const verifyRes = await fetch(`https://graph.facebook.com/v21.0/${appId}/subscriptions?access_token=${appToken}`);
  console.log('Verified Subscriptions:', await verifyRes.json());
}

main().catch(console.error);
