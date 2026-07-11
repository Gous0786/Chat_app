import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { login } from '../../Redux/Auth/Action';
import LiquidGlass from '../ui/LiquidGlass';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';

const Signin = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [inputData, setInputData] = useState({ email: '', password: '' });
  const dispatch = useDispatch();
  const token = localStorage.getItem('jwt');
  const auth = useSelector((store) => store.auth);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await dispatch(login(inputData));
      toast.success('Login successful!');
    } catch (error) {
      toast.error('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputData((values) => ({ ...values, [name]: value }));
  };

  useEffect(() => {
    if (token || (auth.reqUser && auth.reqUser.full_name)) {
      navigate('/');
    }
  }, [token, auth.reqUser?.full_name, navigate]); // Check for necessary dependencies only

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      {/* ambient gold wash */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(900px 500px at 20% 10%, rgba(228,197,144,0.10), transparent 55%), radial-gradient(700px 600px at 90% 95%, rgba(255,255,255,0.03), transparent 60%)',
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[420px]"
      >
        <div className="mb-8 text-center">
          <h1 className="font-display text-5xl text-ink">Aura</h1>
          <p className="mt-2 font-sans text-sm text-ink-muted">
            Welcome back. Sign in to continue.
          </p>
        </div>

        <LiquidGlass className="rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="relative space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="font-sans text-sm text-ink-muted">
                Email
              </label>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                onChange={handleChange}
                value={inputData.email}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="font-sans text-sm text-ink-muted">
                Password
              </label>
              <Input
                id="password"
                type="password"
                name="password"
                placeholder="••••••••"
                onChange={handleChange}
                value={inputData.password}
              />
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </LiquidGlass>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm">
          <span className="text-ink-muted">New here?</span>
          <button
            onClick={() => navigate('/signup')}
            className="font-medium text-accent transition-opacity hover:opacity-80"
          >
            Create an account
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Signin;
