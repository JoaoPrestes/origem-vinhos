import { db } from './db';
import { users, products } from './schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Iniciando o seeding seguro do banco de dados (Modo Não-Destrutivo)...');

  // 1. Cria senhas criptografadas usando a API do Bun
  const adminPasswordHash = await Bun.password.hash('Admin123Secret!');
  const clientPasswordHash = await Bun.password.hash('clientepassword');

  // 2. Cadastra os usuários de teste (apenas se não existirem)
  await db
    .insert(users)
    .values([
      {
        name: 'Administrador Master',
        email: 'admin@origem.com',
        password: adminPasswordHash,
        birthDate: new Date('1990-01-01'),
        profile: 'Admin',
      },
      {
        name: 'Adega Administrador',
        email: 'admin@origemvinhos.com',
        password: adminPasswordHash,
        birthDate: new Date('1985-05-15'),
        profile: 'Admin',
      },
      {
        name: 'Cliente Teste',
        email: 'cliente@email.com',
        password: clientPasswordHash,
        birthDate: new Date('1990-10-20'),
        profile: 'Customer',
      },
    ])
    .onConflictDoNothing({ target: users.email });

  console.log('Usuários de teste e administradores verificados/inseridos com sucesso!');


  // 3. Cadastra os vinhos iniciais no catálogo (apenas se o produto pelo nome não existir)
  const initialWines = [
    {
      name: 'Château Margaux 2015',
      price: '850.00',
      description: 'Um dos vinhos tintos mais prestigiosos do mundo, com notas florais, de frutas vermelhas e especiarias doces. Encorpado e de final persistente.',
      image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=500',
      type: 'Tinto' as const,
      grape: 'Cabernet Sauvignon',
      country: 'França',
      harvest: 2015,
      alcohol: '13.50',
    },
    {
      name: 'Chablis Premier Cru 2020',
      price: '320.00',
      description: 'Vinho branco mineral, extremamente fresco e elegante, apresentando acidez vibrante com notas cítricas e de pêssego branco.',
      image: 'https://images.unsplash.com/photo-1569919650476-f54f2f40d131?w=500',
      type: 'Branco' as const,
      grape: 'Chardonnay',
      country: 'França',
      harvest: 2020,
      alcohol: '12.50',
    },
    {
      name: 'Cave Geisse Terroir Brut',
      price: '180.00',
      description: 'Espumante brasileiro de altíssima qualidade, produzido pelo método tradicional em Pinto Bandeira com guarda de 36 meses em leveduras.',
      image: 'https://images.unsplash.com/photo-1594756202469-9ff9799a2e4e?w=500',
      type: 'Espumante' as const,
      grape: 'Chardonnay & Pinot Noir',
      country: 'Brasil',
      harvest: 2019,
      alcohol: '12.00',
    },
    {
      name: 'Casillero del Diablo Cabernet Sauvignon 2021',
      price: '59.90',
      description: 'Um clássico Cabernet Sauvignon chileno, com corpo médio, taninos firmes e notas de ameixa preta e baunilha.',
      image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=500',
      type: 'Tinto' as const,
      grape: 'Cabernet Sauvignon',
      country: 'Chile',
      harvest: 2021,
      alcohol: '13.50',
    },
    {
      name: 'Castaño Monastrell Rosado 2020',
      price: '89.00',
      description: 'Um rosé espanhol fresco, muito aromático, com notas intensas de frutas vermelhas e acidez equilibrada.',
      image: 'https://images.unsplash.com/photo-1553184918-8fa06708b77d?w=500',
      type: 'Rosé' as const,
      grape: 'Monastrell',
      country: 'Espanha',
      harvest: 2020,
      alcohol: '12.50',
    },
  ];

  let insertedCount = 0;
  for (const wine of initialWines) {
    const existing = await db.select().from(products).where(eq(products.name, wine.name));
    if (existing.length === 0) {
      await db.insert(products).values(wine);
      insertedCount++;
    }
  }

  console.log(`Seeding concluído! (${insertedCount} novos vinhos inseridos, mantendo todos os dados existentes intactos).`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Erro ao realizar o seeding:', err);
  process.exit(1);
});
