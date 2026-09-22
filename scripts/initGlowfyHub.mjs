/**
 * Glowfy Hub - Script de Inicialização e Seed do Firestore
 * 
 * Executa a conexão ao projeto "glowfyhub" e inicializa programaticamente:
 * 1. Coleção 'stores': Registo de comércios (id, name, segment, ownerEmail, createdAt, active, storeId)
 * 2. Coleção 'users': Super Admins e Comerciantes vinculados por storeId (uid, email, role, storeId)
 * 3. Seed Data:
 *    - Super Admin: admin@glowfyhub.com (role: 'superadmin')
 *    - Comércio de Exemplo: "Mister Navalha" (role: 'merchant', storeId: 'store_mister_navalha_01')
 * 
 * Como executar:
 * node scripts/initGlowfyHub.mjs
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';

// Configuração do projeto Firebase "glowfyhub"
const firebaseConfig = {
  apiKey: "AIzaSyDNlV8kcdZO08EQj--iYxohq21qvZeHH48",
  authDomain: "glowfyhub.firebaseapp.com",
  projectId: "glowfyhub",
  storageBucket: "glowfyhub.firebasestorage.app",
  messagingSenderId: "571982162818",
  appId: "1:571982162818:web:97d84343ebcf2476aabd9b"
};

// Inicialização da instância Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("==================================================");
console.log("🚀 GLOWFY HUB - INICIALIZAÇÃO DE BANCO FIRESTORE");
console.log(`📡 Conectado ao projeto: ${firebaseConfig.projectId}`);
console.log("==================================================\n");

async function initializeDatabase() {
  try {
    // ---------------------------------------------------------
    // 1. INICIALIZAÇÃO E SEED DO SUPER ADMIN (Coleção 'users')
    // ---------------------------------------------------------
    const superAdminUid = "usr_superadmin_master_01";
    const superAdminEmail = "admin@glowfyhub.com";
    
    console.log("🔍 [1/3] Verificando utilizador Super Admin...");
    const superAdminDocRef = doc(db, "users", superAdminUid);
    const superAdminSnap = await getDoc(superAdminDocRef);

    if (!superAdminSnap.exists()) {
      const superAdminData = {
        uid: superAdminUid,
        email: superAdminEmail,
        role: "superadmin",
        storeId: null, // Super Admin tem acesso global, sem loja fixa
        name: "Super Admin Glowfy Hub",
        active: true,
        createdAt: new Date().toISOString()
      };

      await setDoc(superAdminDocRef, superAdminData);
      console.log(`✅ Super Admin criado com sucesso: ${superAdminEmail} (${superAdminUid})`);
    } else {
      console.log(`ℹ️ Super Admin já existente no Firestore: ${superAdminEmail}`);
    }

    // Criar também registro para o email do desenvolvedor/admin secundário se desejar
    const devAdminUid = "usr_superadmin_dev_01";
    const devAdminEmail = "interacaodigitall@gmail.com";
    const devAdminDocRef = doc(db, "users", devAdminUid);
    const devAdminSnap = await getDoc(devAdminDocRef);
    if (!devAdminSnap.exists()) {
      await setDoc(devAdminDocRef, {
        uid: devAdminUid,
        email: devAdminEmail,
        role: "superadmin",
        storeId: null,
        name: "Administrador Geral Glowfy",
        active: true,
        createdAt: new Date().toISOString()
      });
      console.log(`✅ Admin master de sistema adicionado: ${devAdminEmail}`);
    }

    // ---------------------------------------------------------
    // 2. INICIALIZAÇÃO E SEED DA LOJA (Coleção 'stores')
    // ---------------------------------------------------------
    const sampleStoreId = "store_mister_navalha_01";
    console.log("\n🔍 [2/3] Verificando comércio de exemplo ('stores')...");
    
    const storeDocRef = doc(db, "stores", sampleStoreId);
    const storeSnap = await getDoc(storeDocRef);

    if (!storeSnap.exists()) {
      const sampleStoreData = {
        id: sampleStoreId,
        storeId: sampleStoreId,
        name: "Mister Navalha",
        segment: "barbershop", // Barbearia tradicional & moderna
        ownerEmail: "misternavalha@glowfyhub.com",
        ownerName: "Carlos Navalha",
        phone: "+351 912 345 678",
        city: "Lisboa",
        active: true,
        createdAt: new Date().toISOString(),
        settings: {
          currency: "EUR",
          currencySymbol: "€",
          timeSlotInterval: 30
        }
      };

      await setDoc(storeDocRef, sampleStoreData);
      console.log(`✅ Loja de exemplo criada: "${sampleStoreData.name}" (storeId: ${sampleStoreId})`);
    } else {
      console.log(`ℹ️ Loja "${storeSnap.data().name}" já existente no Firestore (storeId: ${sampleStoreId})`);
    }

    // ---------------------------------------------------------
    // 3. INICIALIZAÇÃO DO COMERCIANTE (Coleção 'users')
    // ---------------------------------------------------------
    const merchantUid = "usr_merchant_navalha_01";
    const merchantEmail = "misternavalha@glowfyhub.com";
    
    console.log("\n🔍 [3/3] Verificando utilizador Comerciante ('users')...");
    const merchantDocRef = doc(db, "users", merchantUid);
    const merchantSnap = await getDoc(merchantDocRef);

    if (!merchantSnap.exists()) {
      const merchantUserData = {
        uid: merchantUid,
        email: merchantEmail,
        role: "merchant",
        storeId: sampleStoreId, // Estritamente associado ao "Mister Navalha"
        name: "Carlos Navalha (Proprietário)",
        active: true,
        createdAt: new Date().toISOString()
      };

      await setDoc(merchantDocRef, merchantUserData);
      console.log(`✅ Comerciante criado com sucesso: ${merchantEmail} -> vinculado a ${sampleStoreId}`);
    } else {
      console.log(`ℹ️ Comerciante já existente: ${merchantEmail}`);
    }

    console.log("\n==================================================");
    console.log("🎉 INICIALIZAÇÃO DO BANCO DE DADOS CONCLUÍDA!");
    console.log("==================================================");
    console.log("Resumo das Coleções no Firestore:");
    console.log("• stores/ -> Comércios registados com isolamento por storeId");
    console.log("• users/  -> Super Admins (storeId: null) e Comerciantes (storeId: vinculado)");
    console.log("==================================================\n");

  } catch (error) {
    console.error("❌ Erro ao inicializar a base de dados no Firebase Firestore:", error);
    process.exit(1);
  }
}

// Executar
initializeDatabase();
