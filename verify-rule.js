const {SupabaseClient}=require('@supabase/supabase-js');
const supabase=new SupabaseClient('https://kjfqtenfmxdoyjxxnhnm.supabase.co','sb_secret_dI5gwLE0HaNKXRXWQlgcJg_IRwEZmKU');
async function main(){
  const channelId='678bcdd4-5bd9-4707-ab4d-b50d10c24717';
  const rules=await supabase.from('notification_rules').select('id,channel_id,match_score_min,opportunity_score_min,is_active').eq('channel_id',channelId);
  console.log('Rules for WhatsApp channel:');
  console.log(JSON.stringify(rules.data,null,2));
  const channels=await supabase.from('notification_channels').select('id,name,type,config,is_active,is_verified').eq('id',channelId);
  console.log('\nWhatsApp channel:');
  console.log(JSON.stringify(channels.data,null,2));
}
main().catch(e=>console.error(e.message));