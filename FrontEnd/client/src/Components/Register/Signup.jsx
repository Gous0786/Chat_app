import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button, Snackbar, Alert } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { currentUser, register } from '../../Redux/Auth/Action';

const Signup = () => {
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [inputData, setInputData] = useState({ full_name: "", email: "", password: "" });
  const dispatch = useDispatch();
  const token = localStorage.getItem("jwt");
  const { auth } = useSelector((state) => state);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputData((values) => ({ ...values, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputData.full_name || !inputData.email || !inputData.password) {
      console.log("All fields are required");
      return;
    }
    
    setLoading(true);
    try {
      await dispatch(register(inputData));
      setOpenSnackbar(true);
      navigate("/");
    } catch (error) {
      console.log("Registration failed:", error);
      setOpenSnackbar(true); // Optionally show error message here
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      dispatch(currentUser(token));
    }
  }, [token]);

  useEffect(() => {
    if (auth.reqUser?.full_name) {
      navigate("/");
    }
  }, [auth.reqUser]);

  const handleSnackbarClose = () => {
    setOpenSnackbar(false);
  };

  return (
    <div>
      <div className='flex flex-col justify-center min-h-screen items-center bg-gradient-to-r from-blue-500 to-purple-600 p-8'>
        <div className='w-[30%] p-10 bg-white/20 backdrop-blur-lg rounded-l-lg '>
          <form onSubmit={handleSubmit} className='space-y-5'>
            <div>
              <label htmlFor="full_name" className='mb-2'>User Name</label>
              <input
                id="full_name"
                className='py-2 px-3 outline outline-white w-full rounded-md border-1'
                type="text"
                placeholder='Enter username'
                name="full_name"
                onChange={handleChange}
                value={inputData.full_name}
              />
            </div>

            <div>
              <label htmlFor="email" className='mb-2'>Email</label>
              <input
                id="email"
                className='py-2 px-3 outline outline-white w-full rounded-md border-1'
                type="email"
                placeholder='Enter email'
                name="email"
                onChange={handleChange}
                value={inputData.email}
              />
            </div>

            <div>
              <label htmlFor="password" className='mb-2'>Password</label>
              <input
                id="password"
                className='py-2 px-3 outline outline-white w-full rounded-md border-1'
                type="password"
                placeholder='Enter password'
                name="password"
                onChange={handleChange}
                value={inputData.password}
              />
            </div>

            <div>
              <Button variant="contained" type="submit" className='w-full' disabled={loading}>
                {loading ? 'Signing Up...' : 'Sign Up'}
              </Button>
            </div>
          </form>

          <div className='flex space-x-3 items-center mt-5'>
            <p>Already Have an Account?</p>
            <Button variant="contained" onClick={() => navigate("/signin")}>Sign In</Button>
          </div>
        </div>
      </div>

      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          variant="filled"
          sx={{
            width: '100%',
            bgcolor: 'blue.600',
            color: 'white'
          }}
        >
          Your Account was successfully created!
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Signup;
