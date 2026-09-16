const{SupabaseClient}=require('@supabase/supabase-js');
const supabase=new SupabaseClient('https://kjfqtenfmxdoyjxxnhnm.supabase.co','sb_secret_dI5gwLE0HaNKXRXWQlgcJg_IRwEZmKU');

async function main(){
  const tablesToCheck=[
    'public.profiles',
    'public.users',
    'public.user_profiles',
    'public.user_preferences',
    'public.upwork_profiles'
  ];

  for(const table of tablesToCheck){
    try{
      const{ data, error }=await supabase
        .from(table)
        .select('*')
        .eq('email','usamaadeel1183@gmail.com')
        .limit(5);
      if(error) console.log(`${table}: ERROR - ${error.message}`);
      else console.log(`${table}:`, JSON.stringify(data,null,2));
    }catch(e){
      console.log(`${table}: EXCEPTION - ${e.message}`);
    }
  }

  console.log('\n--- Looking for user 848cfcde ---');
  const channelOwnerId='848cfcde-6630-46ae-bc81-c2562ad004c6';
  for(const table of tablesToCheck){
    try{
      const{ data, error }=await supabase
        .from(table)
        .select('id,email,user_id')
        .eq('user_id',channelOwnerId)
        .limit(5);
      if(error){
        try{
          const{ data: d2, error: e2 }=await supabase
            .from(table)
            .select('id')
            .eq('id',channelOwnerId)
            .limit(5);
          if(e2) console.log(`${table} (by id): ERROR - ${e2.message}`);
          else console.log(`${table} (by id):`, JSON.stringify(d2,null,2));
        }catch(e2){
          console.log(`${table} (by id): EXCEPTION - ${e2.message}`);
        }
      } else if(data && data.length>0){
        console.log(`${table} (by user_id):`, JSON.stringify(data,null,2));
      }
    }catch(e){
      console.log(`${table}: EXCEPTION - ${e.message}`);
    }
  }

  console.log('\n--- Table listing ---');
  try{
    const{ data: tableInfo }=await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema','public')
      .order('table_name');
    if(tableInfo) console.log('Public tables:', tableInfo.map(t=>t.table_name).join(', '));
  }catch(e){
    console.log('Could not list tables:', e.message);
  }
}
main().catch(e=>console.error('Fatal:',e.message));