// A broad, ethnically-mixed Malaysian name pool (matching the brand voice
// already established — Aisha Rahman, Farid Hassan, Priya Nair, David
// Tan, Grace Lim), shared across every industry and every generator that
// needs a person's name (CompanyGenerator's employees/customer contacts,
// EnterpriseUserGenerator's Enterprise Users) since names don't need to be
// industry-specific, just varied enough for a 60-person roster at the
// Large tier. Extracted to its own leaf module (rather than living in
// CompanyGenerator.ts) so EnterpriseUserGenerator.ts can import it without
// creating a circular dependency with CompanyGenerator.ts, which itself
// calls into EnterpriseUserGenerator.ts.
export const FIRST_NAMES = [
  "Aisha", "Farid", "Priya", "David", "Grace", "Michelle", "Kevin", "Ryan", "Amirah", "Hafiz",
  "Siti", "Wei Ling", "Kumar", "Nurul", "Azman", "Chen", "Deepa", "Faizal", "Jia Hui", "Rajesh",
  "Zainab", "Wong", "Aravind", "Fatimah", "Jason", "Nadia", "Vincent", "Suresh", "Elaine", "Hakim",
  "Mei Ling", "Arjun", "Halim", "Cheryl", "Rizal", "Yasmin", "Tan", "Kavitha", "Shafiq", "Adeline",
];

export const LAST_NAMES = [
  "Rahman", "Hassan", "Nair", "Tan", "Lim", "Ong", "Wong", "Choo", "Ibrahim", "Kaur",
  "Chong", "Ramasamy", "Osman", "Yap", "Krishnan", "Aziz", "Lee", "Subramaniam", "Karim", "Goh",
  "Mansor", "Selvam", "Teoh", "Bakar", "Pillai", "Foo", "Rashid", "Menon", "Loh", "Hamzah",
];
