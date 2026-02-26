// Script de diagnóstico para verificar conexión con InsForge
// Ejecutar con: node test-insforge.js

import { createClient } from '@insforge/sdk';
import dotenv from 'dotenv';

dotenv.config();

const INSFORGE_URL = process.env.PUBLIC_INSFORGE_URL;
const INSFORGE_ANON_KEY = process.env.PUBLIC_INSFORGE_ANON_KEY;

console.log('=== DIAGNÓSTICO DE INSFORGE ===\n');

if (!INSFORGE_URL || !INSFORGE_ANON_KEY) {
    console.error('❌ ERROR: Faltan variables de entorno');
    console.log('Asegúrate de tener un archivo .env con:');
    console.log('  PUBLIC_INSFORGE_URL=https://tu-app.insforge.app');
    console.log('  PUBLIC_INSFORGE_ANON_KEY=tu-anon-key');
    process.exit(1);
}

console.log('✓ Variables de entorno configuradas');
console.log(`  URL: ${INSFORGE_URL}`);
console.log(`  KEY: ${INSFORGE_ANON_KEY.substring(0, 10)}...\n`);

const client = createClient({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_ANON_KEY
});

async function testConnection() {
    try {
        console.log('1. Probando conexión básica...');
        const { data, error } = await client.database
            .from('perfiles')
            .select('count')
            .limit(1);
        
        if (error) {
            console.error('❌ Error en conexión:', error.message);
            return;
        }
        console.log('✓ Conexión exitosa a la base de datos\n');
        
        console.log('2. Verificando tabla perfiles...');
        const { data: profiles, error: profilesError } = await client.database
            .from('perfiles')
            .select('*')
            .limit(1);
        
        if (profilesError) {
            console.error('❌ Error accediendo a perfiles:', profilesError.message);
            if (profilesError.message.includes('row-level security')) {
                console.log('\n⚠️  PROBLEMA DE RLS DETECTADO');
                console.log('Las políticas RLS están bloqueando el acceso anónimo.');
                console.log('Soluciones:');
                console.log('  1. Desactivar RLS temporalmente: ALTER TABLE perfiles DISABLE ROW LEVEL SECURITY;');
                console.log('  2. O crear una política para acceso anónimo de lectura');
                console.log('  3. O asegurarte de que todas las consultas incluyan el token de autenticación');
            }
            return;
        }
        console.log('✓ Tabla perfiles accesible\n');
        
        console.log('=== RESUMEN ===');
        console.log('✓ Todo parece funcionar correctamente');
        console.log('\nSi aún tienes problemas con el login:');
        console.log('  1. Verifica que las credenciales sean correctas');
        console.log('  2. Revisa la consola del navegador (F12)');
        console.log('  3. Verifica que las cookies se estén estableciendo correctamente');
        
    } catch (err) {
        console.error('❌ Error inesperado:', err.message);
    }
}

testConnection();
