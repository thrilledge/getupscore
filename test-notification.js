const https=require('https');

async function main(){
  const channelId='678bcdd4-5bd9-4707-ab4d-b50d10c24717';
  const userId='848cfcde-6630-46ae-bc81-c2562ad004c6';
  const cronSecret='0b34f5d0f122f313ad8668ddad9ebe8f';

  // Test via production Vercel endpoint
  const url='https://www.getupscore.com/api/notifications/send';
  const postData=JSON.stringify({channelId, user_id:userId});

  const response=await fetch(url,{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Authorization':'Bearer '+cronSecret
    },
    body:postData
  });

  const data=await response.json();
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(data,null,2));
}

main().catch(e=>console.error(e.message));