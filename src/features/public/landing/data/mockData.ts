export interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: string;
  description: string;
  imagePlaceholder: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  ingredients: string[];
  imagePlaceholder: string;
}

export interface Package {
  id: string;
  name: string;
  services: string[];
  price: number;
  originalPrice: number;
  savings: string;
  description: string;
  imagePlaceholder: string;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  code: string;
  validUntil: string;
}

export interface Notification {
  id: string;
  type: 'appointment_reminder' | 'follow_up' | 'offer' | 'order_update';
  title: string;
  message: string;
  date: string;
  read: boolean;
}

export interface FollowUp {
  id: string;
  serviceName: string;
  date: string;
  type:
  'check_in' |
  'photo_request' |
  'rebooking_reminder' |
  'product_recommendation';
  status: 'pending' | 'completed';
  message: string;
  day: number;
}

export const categories = [
{ id: 'brows', name: 'Brows', description: 'Expert shaping and enhancement' },
{
  id: 'lashes',
  name: 'Lashes',
  description: 'Extensions and lifts for captivating eyes'
},
{
  id: 'lips',
  name: 'Lips',
  description: 'Blush and fillers for perfect pouts'
},
{ id: 'skin', name: 'Skin', description: 'Rejuvenating facial treatments' },
{
  id: 'hair-removal',
  name: 'Hair Removal',
  description: 'Smooth, flawless skin'
},
{
  id: 'nails',
  name: 'Nails',
  description: 'Premium manicures and pedicures'
}];


export const services: Service[] = [
// Brows
{
  id: 'b1',
  name: 'Threading',
  category: 'Brows',
  price: 45,
  duration: '15 min',
  description:
  'Precise hair removal using antibacterial cotton thread for perfectly shaped brows.',
  imagePlaceholder: 'bg-stone-200'
},
{
  id: 'b2',
  name: 'Tinting',
  category: 'Brows',
  price: 65,
  duration: '20 min',
  description:
  'Custom-blended tint to enhance the color and thickness of your natural brows.',
  imagePlaceholder: 'bg-stone-100'
},
{
  id: 'b3',
  name: 'Lamination',
  category: 'Brows',
  price: 250,
  duration: '45 min',
  description:
  'A perm for your brows, giving them a set, uniform shape for an extended period.',
  imagePlaceholder: 'bg-stone-200'
},
{
  id: 'b4',
  name: 'Microblading',
  category: 'Brows',
  price: 1500,
  duration: '120 min',
  description:
  'Semi-permanent tattooing technique that creates hair-like strokes for fuller brows.',
  imagePlaceholder: 'bg-stone-100'
},

// Lashes
{
  id: 'l1',
  name: 'Classic Extensions',
  category: 'Lashes',
  price: 350,
  duration: '90 min',
  description:
  'One extension applied to one natural lash for a subtle, mascara-like effect.',
  imagePlaceholder: 'bg-stone-200'
},
{
  id: 'l2',
  name: 'Volume Extensions',
  category: 'Lashes',
  price: 550,
  duration: '120 min',
  description:
  'Multiple lightweight extensions applied to one natural lash for a dramatic look.',
  imagePlaceholder: 'bg-stone-100'
},
{
  id: 'l3',
  name: 'Lash Lift',
  category: 'Lashes',
  price: 200,
  duration: '45 min',
  description:
  'A semi-permanent treatment that gives your natural lashes an illusion of perfectly curled lashes.',
  imagePlaceholder: 'bg-stone-200'
},

// Lips
{
  id: 'p1',
  name: 'Lip Blush',
  category: 'Lips',
  price: 1200,
  duration: '120 min',
  description:
  'Semi-permanent makeup that enhances the natural tint and shape of your lips.',
  imagePlaceholder: 'bg-stone-100'
},
{
  id: 'p2',
  name: 'Lip Filler',
  category: 'Lips',
  price: 2500,
  duration: '45 min',
  description:
  'Hyaluronic acid injections to add volume and shape to your lips.',
  imagePlaceholder: 'bg-stone-200'
},

// Skin
{
  id: 's1',
  name: 'Hydrafacial',
  category: 'Skin',
  price: 450,
  duration: '60 min',
  description:
  'A multi-step treatment that cleanses, exfoliates, and extracts to get rid of impurities.',
  imagePlaceholder: 'bg-stone-100'
},
{
  id: 's2',
  name: 'Chemical Peel',
  category: 'Skin',
  price: 350,
  duration: '45 min',
  description:
  'A skin-resurfacing procedure to remove the top layers of the skin.',
  imagePlaceholder: 'bg-stone-200'
},
{
  id: 's3',
  name: 'Microneedling',
  category: 'Skin',
  price: 600,
  duration: '60 min',
  description:
  'Collagen induction therapy to improve skin texture and firmness.',
  imagePlaceholder: 'bg-stone-100'
},

// Hair Removal
{
  id: 'h1',
  name: 'Laser Full Body',
  category: 'Hair Removal',
  price: 2000,
  duration: '90 min',
  description:
  'Permanent hair reduction using advanced laser technology for the entire body.',
  imagePlaceholder: 'bg-stone-200'
},
{
  id: 'h2',
  name: 'Laser Underarms',
  category: 'Hair Removal',
  price: 200,
  duration: '15 min',
  description:
  'Quick and effective laser hair removal for the underarm area.',
  imagePlaceholder: 'bg-stone-100'
},
{
  id: 'h3',
  name: 'Waxing',
  category: 'Hair Removal',
  price: 150,
  duration: '30 min',
  description: 'Traditional hair removal using premium hard or soft wax.',
  imagePlaceholder: 'bg-stone-200'
},

// Nails
{
  id: 'n1',
  name: 'Gel Manicure',
  category: 'Nails',
  price: 120,
  duration: '45 min',
  description:
  'Long-lasting gel polish application with cuticle care and shaping.',
  imagePlaceholder: 'bg-stone-100'
},
{
  id: 'n2',
  name: 'Gel Pedicure',
  category: 'Nails',
  price: 150,
  duration: '60 min',
  description:
  'Relaxing foot soak, exfoliation, cuticle care, and gel polish application.',
  imagePlaceholder: 'bg-stone-200'
},
{
  id: 'n3',
  name: 'Nail Art',
  category: 'Nails',
  price: 200,
  duration: '30 min',
  description: 'Custom designs and embellishments for your nails.',
  imagePlaceholder: 'bg-stone-100'
}];


export const featuredTreatments = services.filter((s) =>
['b4', 's1', 'p1', 'l2'].includes(s.id)
);

export const products: Product[] = [
{
  id: 'pr1',
  name: 'Brow Serum',
  category: 'Brows',
  price: 180,
  description: 'Nourishing serum to promote thicker, fuller brows.',
  ingredients: ['Peptides', 'Biotin', 'Hyaluronic Acid'],
  imagePlaceholder: 'bg-stone-200'
},
{
  id: 'pr2',
  name: 'Lash Growth Serum',
  category: 'Lashes',
  price: 220,
  description: 'Advanced formula for longer, stronger lashes in 4 weeks.',
  ingredients: ['Panthenol', 'Amino Acids', 'Pumpkin Seed Extract'],
  imagePlaceholder: 'bg-stone-100'
},
{
  id: 'pr3',
  name: 'Lip Balm SPF',
  category: 'Lips',
  price: 85,
  description:
  'Hydrating balm with sun protection to keep lips soft and safe.',
  ingredients: ['Shea Butter', 'Vitamin E', 'Zinc Oxide'],
  imagePlaceholder: 'bg-stone-200'
},
{
  id: 'pr4',
  name: 'Hydrating Face Mist',
  category: 'Skincare',
  price: 150,
  description: 'Refreshing mist to instantly hydrate and soothe the skin.',
  ingredients: ['Rose Water', 'Aloe Vera', 'Glycerin'],
  imagePlaceholder: 'bg-stone-100'
},
{
  id: 'pr5',
  name: 'Retinol Night Cream',
  category: 'Skincare',
  price: 280,
  description:
  'Potent overnight treatment to reduce fine lines and improve texture.',
  ingredients: ['Retinol', 'Ceramides', 'Squalane'],
  imagePlaceholder: 'bg-stone-200'
},
{
  id: 'pr6',
  name: 'Vitamin C Serum',
  category: 'Skincare',
  price: 240,
  description: 'Brightening serum to even skin tone and boost radiance.',
  ingredients: ['Vitamin C', 'Ferulic Acid', 'Vitamin E'],
  imagePlaceholder: 'bg-stone-100'
},
{
  id: 'pr7',
  name: 'Gentle Cleanser',
  category: 'Skincare',
  price: 120,
  description: 'Mild, non-stripping cleanser for daily use.',
  ingredients: ['Chamomile', 'Oat Extract', 'Glycerin'],
  imagePlaceholder: 'bg-stone-200'
},
{
  id: 'pr8',
  name: 'Sunscreen SPF50',
  category: 'Skincare',
  price: 160,
  description: 'Lightweight, invisible broad-spectrum protection.',
  ingredients: ['Zinc Oxide', 'Titanium Dioxide', 'Niacinamide'],
  imagePlaceholder: 'bg-stone-100'
}];


export const packages: Package[] = [
{
  id: 'pkg1',
  name: 'Bridal Glow',
  services: ['Hydrafacial', 'Lash Extensions', 'Lip Blush'],
  price: 1800,
  originalPrice: 2000,
  savings: '10%',
  description:
  'The ultimate preparation for your special day. Achieve radiant skin, captivating eyes, and perfect lips.',
  imagePlaceholder: 'bg-stone-200'
},
{
  id: 'pkg2',
  name: 'Brow Perfection',
  services: ['Microblading', 'Lamination', 'Tinting'],
  price: 1600,
  originalPrice: 1815,
  savings: '15%',
  description:
  'Complete brow transformation for flawless, long-lasting results.',
  imagePlaceholder: 'bg-stone-100'
},
{
  id: 'pkg3',
  name: 'Skin Revival',
  services: ['3x Hydrafacial', 'Chemical Peel'],
  price: 1500,
  originalPrice: 1700,
  savings: '12%',
  description:
  'A comprehensive skin reset program to deeply cleanse, exfoliate, and rejuvenate.',
  imagePlaceholder: 'bg-stone-200'
},
{
  id: 'pkg4',
  name: 'Lash & Brow Duo',
  services: ['Lash Lift', 'Brow Lamination'],
  price: 380,
  originalPrice: 450,
  savings: '15%',
  description:
  'Enhance your natural features with our popular lift and lamination combo.',
  imagePlaceholder: 'bg-stone-100'
}];


export const offers: Offer[] = [
{
  id: 'off1',
  title: '20% off first visit',
  description:
  'Welcome to Château Glow. Enjoy 20% off any single service on your first visit.',
  code: 'WELCOME20',
  validUntil: 'Ongoing'
},
{
  id: 'off2',
  title: 'Refer a friend get AED 100 credit',
  description:
  'Share the love. When your friend books their first appointment, you both get AED 100 credit.',
  code: 'REFER100',
  validUntil: 'Ongoing'
},
{
  id: 'off3',
  title: 'Summer Glow Package - Limited Time',
  description:
  'Book our Skin Revival package this month and receive a complimentary Hydrating Face Mist.',
  code: 'SUMMERGLOW',
  validUntil: 'Aug 31, 2024'
}];


export const mockNotifications: Notification[] = [
{
  id: 'n1',
  type: 'appointment_reminder',
  title: 'Upcoming Appointment',
  message: 'Your Hydrafacial is tomorrow at 2:30 PM.',
  date: '2 hours ago',
  read: false
},
{
  id: 'n2',
  type: 'follow_up',
  title: 'Check-in Required',
  message: 'How are your brows healing? Time for your day 7 check-in.',
  date: '1 day ago',
  read: false
},
{
  id: 'n3',
  type: 'order_update',
  title: 'Order Shipped',
  message: 'Your Brow Serum has shipped and will arrive soon.',
  date: '2 days ago',
  read: true
},
{
  id: 'n4',
  type: 'offer',
  title: 'New Offer',
  message: 'New: 20% off all skin treatments this week.',
  date: '1 week ago',
  read: true
}];


export const mockFollowUps: FollowUp[] = [
{
  id: 'f1',
  serviceName: 'Microblading',
  date: 'Oct 10, 2023',
  type: 'check_in',
  status: 'pending',
  message: 'How is the treated area? Any concerns?',
  day: 1
},
{
  id: 'f2',
  serviceName: 'Microblading',
  date: 'Oct 12, 2023',
  type: 'photo_request',
  status: 'pending',
  message: 'Upload a photo of your brows for our specialist to review.',
  day: 3
},
{
  id: 'f3',
  serviceName: 'Microblading',
  date: 'Oct 16, 2023',
  type: 'check_in',
  status: 'pending',
  message: 'Your brows should be starting to peel - this is normal.',
  day: 7
},
{
  id: 'f4',
  serviceName: 'Microblading',
  date: 'Oct 23, 2023',
  type: 'rebooking_reminder',
  status: 'pending',
  message: 'Recovery complete! Book your touch-up appointment.',
  day: 14
}];