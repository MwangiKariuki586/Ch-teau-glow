export function VideoShowcaseSection() {
  return (
    <section className="py-20 bg-[#F9F5F0]">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="relative rounded-2xl overflow-hidden shadow-xl max-h-[500px]">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-auto object-cover"
            style={{ maxHeight: '500px' }}
          >
            <source
              src="https://browz.ae/cdn/shop/videos/c/vp/cd9afd5f6ff64e09b3fa7202984badc4/cd9afd5f6ff64e09b3fa7202984badc4.HD-1080p-7.2Mbps-36723424.mp4?v=0"
              type="video/mp4"
            />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </section>
  );
}
