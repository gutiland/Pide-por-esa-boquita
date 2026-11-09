import Pub from "../Model/Pub.js";
import Drinks from "../Model/Drinks.js";

export async function initializePubs() {
  // users puede contener otras prácticas. Solo migramos cuentas con un pub explícito.
  const legacyAccounts = (
    await Pub.db
      .collection("users")
      .find({
        pub: { $type: "string", $ne: "" },
      })
      .toArray()
  ).filter((account) => account.pub.trim().length > 0);

  // Detectamos ambigüedades antes de copiar: nunca elegimos una contraseña al azar.
  const slugs = legacyAccounts.map((account) => account.pub.trim());
  if (new Set(slugs).size !== slugs.length) {
    throw new Error(
      "Varias cuentas antiguas tienen el mismo pub. Hay que elegir su cuenta de acceso antes de migrar.",
    );
  }

  for (const account of legacyAccounts) {
    const slug = account.pub.trim();
    // Una cuenta ya migrada se gestiona desde pubs: no sobrescribimos sus cambios.
    if (await Pub.exists({ _id: account._id })) continue;

    if (
      typeof account.email !== "string" ||
      typeof account.password !== "string"
    ) {
      throw new Error(
        "La cuenta antigua del pub " + slug + " no tiene credenciales válidas.",
      );
    }
    const collision = await Pub.exists({
      $or: [{ pub: slug }, { email: account.email.trim().toLowerCase() }],
    });
    if (collision) {
      throw new Error(
        "Ya existe otra cuenta con el pub o email de " +
          slug +
          ". Revisa la migración.",
      );
    }

    // Conserva ID y hash bcrypt. No se imprime ni se transforma la contraseña.
    await Pub.create({
      _id: account._id,
      pub: slug,
      name: account.name || slug,
      email: account.email,
      password: account.password,
      ...(account.logo ? { logo: account.logo } : {}),
      ...(account.description ? { description: account.description } : {}),
    });
    console.log("Cuenta de pub migrada: " + slug);
  }

  const pubs = await Pub.find();
  if (pubs.length === 1) {
    // La carta global de la demo solo se asigna cuando el propietario es inequívoco.
    const result = await Drinks.updateMany(
      { $or: [{ pub: { $exists: false } }, { pub: null }, { pub: "" }] },
      { $set: { pub: pubs[0].pub } },
    );
    if (result.modifiedCount)
      console.log("Carta de la demo asociada a " + pubs[0].pub);
  }
  await Pub.init();
}
