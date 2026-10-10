import Image from "next/image";

const doctors = [
  {
    name: "Dr Zack Ally",
    title: "Global Trainer & Medical Director at Château Glow",
    image: "https://browz.ae/cdn/shop/files/ZACK_a22452c8-17eb-4b0a-b95f-420c9df5353c.jpg?v=1764328290&width=500",
    initials: "ZA",
  },
  {
    name: "Dr Costas Papageorgiou",
    title: "Medical Director at Harrods",
    image: "https://browz.ae/cdn/shop/files/Costas_Browz.jpg?v=1764328459&width=500",
    initials: "CP",
  },
  {
    name: "Dr Richard Devine",
    title: "MBBS, MSc MRCGP",
    image: "https://browz.ae/cdn/shop/files/Dr_Devine_BROWZ_Dubai.jpg?v=1764328626&width=500",
    initials: "RD",
  },
  {
    name: "Dr Irena Ivanovska",
    title: "Dermatologist and Trichologist",
    image: "https://browz.ae/cdn/shop/files/Dr_Irena_BROWZ_Dubai.jpg?v=1764329092&width=500",
    initials: "II",
  },
];

export function DoctorsSection() {
  return (
    <section className="w-full bg-white py-20">
      <div className="px-[55px]">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-5xl font-bold text-gray-900 md:text-6xl">
              Our Doctors
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-gray-600">
              We have carefully selected a team of renowned therapists, artists,
              and doctors, each an expert in their field.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {doctors.map((doctor) => (
              <div
                key={doctor.name}
                className="group flex flex-col items-center text-center"
              >
                {/* Avatar */}
                <div className="relative mb-5 h-48 w-48 overflow-hidden rounded-full border-4 border-[#6B4423]/10 transition-all duration-300 group-hover:border-[#6B4423]/40 group-hover:shadow-xl">
                  {doctor.image ? (
                    <Image
                      src={doctor.image}
                      alt={doctor.name}
                      fill
                      className="object-cover object-top"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#6B4423]/10 to-[#c9a961]/20">
                      <span className="text-4xl font-bold text-[#6B4423]">
                        {doctor.initials}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <h3 className="mb-1 text-xl font-bold text-gray-900">
                  {doctor.name}
                </h3>
                <p className="text-sm leading-relaxed text-[#6B4423]">
                  {doctor.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
