import { InventoryReason, PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@diagramclo.com";
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

const productCatalog = [
  {
    category: {
      name: "T-Shirts",
      slug: "t-shirts",
      description: "Everyday cotton tees for casual outfits.",
    },
    product: {
      name: "Diagram Classic Tee",
      slug: "diagram-classic-tee",
      description: "A soft everyday tee with a clean Diagramclo front mark.",
      images: [
        {
          url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab",
          altText: "White classic t-shirt",
        },
      ],
      variants: [
        { sku: "DCT-BLK-S", size: "S", color: "Black", priceCents: 1500000, stockQuantity: 20 },
        { sku: "DCT-BLK-M", size: "M", color: "Black", priceCents: 1500000, stockQuantity: 30 },
        { sku: "DCT-WHT-M", size: "M", color: "White", priceCents: 1500000, stockQuantity: 25 },
      ],
    },
  },
  {
    category: {
      name: "Hoodies",
      slug: "hoodies",
      description: "Layering pieces for cooler days.",
    },
    product: {
      name: "Diagram Heavyweight Hoodie",
      slug: "diagram-heavyweight-hoodie",
      description: "A structured pullover hoodie with a relaxed fit.",
      images: [
        {
          url: "https://images.unsplash.com/photo-1556821840-3a63f95609a7",
          altText: "Black pullover hoodie",
        },
      ],
      variants: [
        { sku: "DHH-GRY-M", size: "M", color: "Grey", priceCents: 3200000, stockQuantity: 14 },
        { sku: "DHH-GRY-L", size: "L", color: "Grey", priceCents: 3200000, stockQuantity: 18 },
        { sku: "DHH-BLK-L", size: "L", color: "Black", priceCents: 3400000, stockQuantity: 12 },
      ],
    },
  },
  {
    category: {
      name: "Caps",
      slug: "caps",
      description: "Finishing accessories for daily wear.",
    },
    product: {
      name: "Diagram Five Panel Cap",
      slug: "diagram-five-panel-cap",
      description: "A lightweight five panel cap with adjustable strap.",
      images: [
        {
          url: "https://images.unsplash.com/photo-1529958030586-3aae4ca485ff",
          altText: "Casual black cap",
        },
      ],
      variants: [
        { sku: "DFP-BLK-OS", size: "OS", color: "Black", priceCents: 900000, stockQuantity: 40 },
        { sku: "DFP-OLV-OS", size: "OS", color: "Olive", priceCents: 900000, stockQuantity: 22 },
      ],
    },
  },
];

const seedAdmin = async () => {
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  return prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      role: UserRole.ADMIN,
    },
    create: {
      email: adminEmail,
      passwordHash,
      firstName: "Diagramclo",
      lastName: "Admin",
      role: UserRole.ADMIN,
    },
  });
};

const seedProductCatalog = async () => {
  for (const item of productCatalog) {
    const category = await prisma.category.upsert({
      where: { slug: item.category.slug },
      update: {
        name: item.category.name,
        description: item.category.description,
      },
      create: item.category,
    });

    const product = await prisma.product.upsert({
      where: { slug: item.product.slug },
      update: {
        name: item.product.name,
        description: item.product.description,
        categoryId: category.id,
        isActive: true,
      },
      create: {
        name: item.product.name,
        slug: item.product.slug,
        description: item.product.description,
        categoryId: category.id,
      },
    });

    await prisma.productImage.deleteMany({
      where: { productId: product.id },
    });

    await prisma.productImage.createMany({
      data: item.product.images.map((image, index) => ({
        productId: product.id,
        url: image.url,
        altText: image.altText,
        sortOrder: index,
      })),
    });

    for (const variant of item.product.variants) {
      const savedVariant = await prisma.productVariant.upsert({
        where: { sku: variant.sku },
        update: {
          productId: product.id,
          size: variant.size,
          color: variant.color,
          priceCents: variant.priceCents,
          stockQuantity: variant.stockQuantity,
          isActive: true,
        },
        create: {
          productId: product.id,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          priceCents: variant.priceCents,
          stockQuantity: variant.stockQuantity,
        },
      });

      const existingSeedMovement = await prisma.inventoryMovement.findFirst({
        where: {
          variantId: savedVariant.id,
          reason: InventoryReason.INITIAL_STOCK,
          note: "Seed catalog stock",
        },
      });

      if (!existingSeedMovement) {
        await prisma.inventoryMovement.create({
          data: {
            variantId: savedVariant.id,
            quantity: variant.stockQuantity,
            reason: InventoryReason.INITIAL_STOCK,
            note: "Seed catalog stock",
          },
        });
      }
    }
  }
};

const main = async () => {
  const admin = await seedAdmin();
  await seedProductCatalog();

  const [products, variants] = await Promise.all([
    prisma.product.count(),
    prisma.productVariant.count(),
  ]);

  console.log(`Seeded admin ${admin.email}`);
  console.log(`Seeded ${products} products and ${variants} variants`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
