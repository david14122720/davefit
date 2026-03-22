import { createClient } from '@insforge/sdk';

const insforge = createClient({
  baseUrl: 'https://insforge.tesh.online',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5OTMyNzJ9.7zrvJ3VeVawf0uhSQ7eytXUDzOZMpcOlKg5pbkx2Iik'
});

async function createAdminUser() {
  const email = 'admin@davefit.com';
  const password = 'Admin123!';

  console.log('Creating admin user...');
  
  const { data, error } = await insforge.auth.signUp({
    email,
    password,
    name: 'Admin DaveFit'
  });

  if (error) {
    console.error('Error creating user:', error);
    return;
  }

  console.log('User created:', data?.user);

  if (data?.user) {
    console.log('Setting role to admin...');
    
    const { data: profile, error: profileError } = await insforge.auth.setProfile({
      rol: 'admin'
    });

    if (profileError) {
      console.error('Error setting profile:', profileError);
    } else {
      console.log('Profile updated:', profile);
      console.log('\n✅ Admin user created successfully!');
      console.log('Email:', email);
      console.log('Password:', password);
    }
  }
}

createAdminUser();
