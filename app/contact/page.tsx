'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Mail, Phone, MapPin } from 'lucide-react';

export default function ContactPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    communityName: '',
    communitySize: '',
    role: '',
    message: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!formData.name || !formData.email || !formData.communityName || !formData.role) {
      setError('Please fill in all required fields.');
      setIsLoading(false);
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Contact form submitted:', formData);
      setIsSubmitted(true);
      setFormData({
        name: '',
        email: '',
        communityName: '',
        communitySize: '',
        role: '',
        message: '',
      });
    } catch (err) {
      setError('Failed to send message. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
      {/* Navbar */}
      <nav className="bg-white/60 backdrop-blur-sm border-b border-white/20 sticky top-0 z-50 pt-4">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between h-20 items-center">
            <Link href="/" className="flex items-center -space-x-2">
              <img 
                src="/mooring-logo.svg" 
                alt="Mooring" 
                className="w-24 h-18"
                style={{
                  filter: `hue-rotate(${Math.floor(scrollY / 300) * 30}deg)`,
                  transition: 'filter 0.3s ease',
                }}
              />
              <span className="text-3xl font-bold text-stone-900 -ml-4" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>Mooring</span>
            </Link>
            <div className="hidden md:block">
              <div className="flex items-center space-x-8">
                <Link href="/" className="text-base text-stone-600 hover:text-stone-900 transition-colors font-sans">Home</Link>
                <Link href="/login" className="bg-teal-600 text-white px-5 py-2 rounded-lg text-base font-medium hover:bg-teal-700 transition-colors font-sans">Log In</Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="py-24 md:py-32 text-center">
        <div className="max-w-5xl mx-auto px-8">
          <h1 className="text-6xl md:text-7xl font-bold text-stone-900 mb-8 tracking-tight">Contact Us</h1>
          <p className="text-2xl text-stone-600 max-w-3xl mx-auto font-medium leading-relaxed">
            Let's discuss how Mooring can empower your innovation community.
          </p>
        </div>
      </header>

      {/* Contact Form Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-8">
          <div className="grid md:grid-cols-2 gap-16 mb-16">
            <div>
              <h2 className="text-4xl font-bold text-stone-900 mb-8 tracking-tight">Get in Touch</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center">
                    <Mail className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-stone-900 mb-2">Email</h3>
                    <p className="text-stone-600 font-medium">hello@mooring.io</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center">
                    <Phone className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-stone-900 mb-2">Phone</h3>
                    <p className="text-stone-600 font-medium">+1 (555) 123-4567</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-stone-900 mb-2">Location</h3>
                    <p className="text-stone-600 font-medium">Boston, MA</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isSubmitted ? (
            <div className="bg-white/80 backdrop-blur-sm border-2 border-teal-600 rounded-3xl p-12 text-center">
              <div className="w-20 h-20 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Mail className="w-10 h-10 text-teal-600" />
              </div>
              <h3 className="text-3xl font-bold text-stone-900 mb-4">Thank You for Your Message!</h3>
              <p className="text-xl text-stone-700 font-medium mb-8">We've received your inquiry and will get back to you shortly.</p>
              <Link href="/" className="inline-flex items-center gap-3 bg-teal-600 text-white px-8 py-4 rounded-2xl text-base font-semibold tracking-wide hover:bg-teal-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                <span>Back to Home</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-sm border border-white/40 rounded-3xl p-12 shadow-xl">
              {error && (
                <div className="bg-red-50 border-2 border-red-600 text-red-800 p-6 rounded-2xl mb-8">
                  <p className="font-semibold">{error}</p>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-base font-bold text-stone-900 mb-3">Your Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-6 py-4 border-2 border-stone-200 rounded-2xl focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-all font-medium"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-base font-bold text-stone-900 mb-3">Your Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-6 py-4 border-2 border-stone-200 rounded-2xl focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-all font-medium"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="communityName" className="block text-base font-bold text-stone-900 mb-3">Community/Organization Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    id="communityName"
                    name="communityName"
                    value={formData.communityName}
                    onChange={handleChange}
                    className="w-full px-6 py-4 border-2 border-stone-200 rounded-2xl focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-all font-medium"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="communitySize" className="block text-base font-bold text-stone-900 mb-3">Community Size</label>
                  <select
                    id="communitySize"
                    name="communitySize"
                    value={formData.communitySize}
                    onChange={handleChange}
                    className="w-full px-6 py-4 border-2 border-stone-200 rounded-2xl focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-all font-medium"
                  >
                    <option value="">Select size</option>
                    <option value="<50">&lt; 50 members</option>
                    <option value="50-200">50 - 200 members</option>
                    <option value="200-500">200 - 500 members</option>
                    <option value="500+">500+ members</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="role" className="block text-base font-bold text-stone-900 mb-3">Your Role <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-6 py-4 border-2 border-stone-200 rounded-2xl focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-all font-medium"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-base font-bold text-stone-900 mb-3">How can we help?</label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-6 py-4 border-2 border-stone-200 rounded-2xl focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-all font-medium"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full bg-teal-600 text-white font-bold px-8 py-5 rounded-2xl hover:bg-teal-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-16 text-center text-stone-700 space-y-4">
            <p className="text-2xl font-bold">What happens next?</p>
            <p className="text-xl font-medium leading-relaxed max-w-3xl mx-auto">
              Once you send your message, our team will review your inquiry and get back to you within 1-2 business days to schedule a brief discovery call. We look forward to learning about your community's unique needs!
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white/30 backdrop-blur-sm border-t border-white/40">
        <div className="max-w-6xl mx-auto px-8 text-center">
          <p className="text-stone-600 font-medium">&copy; {new Date().getFullYear()} Mooring. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
