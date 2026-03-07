const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jtoozennflwmvexlogcq.supabase.co';
const supabaseKey = 'sb_publishable_8fJtxpxT0vlEJyAF8nsMLA_r6EU0VZz';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runCheck() {
    console.log('--- Checking Database Connectivity ---');

    // 1. Check Profiles/Users table
    console.log('\n[1] Checking "users" table...');
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .limit(1);

    if (userError) {
        console.error('Error fetching users:', userError);
    } else if (userData && userData.length > 0) {
        console.log('Successfully connected to "users" table.');
        console.log('Available columns:', Object.keys(userData[0]));
    } else {
        console.log('Successfully connected to "users" table, but no data found.');
    }

    // 2. Check Chats table
    console.log('\n[2] Checking "chats" table...');
    const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .limit(1);

    if (chatError) {
        console.error('Error fetching chats:', chatError);
    } else {
        console.log('Successfully connected to "chats" table.');
    }

    // 3. Check Messages table
    console.log('\n[3] Checking "messages" table...');
    const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .limit(1);

    if (msgError) {
        console.error('Error fetching messages:', msgError);
    } else {
        console.log('Successfully connected to "messages" table.');
    }

    console.log('\n--- Check Complete ---');
}

runCheck();
