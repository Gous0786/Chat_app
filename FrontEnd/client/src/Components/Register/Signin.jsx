import { Alert, Button, Snackbar } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login } from '../../Redux/Auth/Action';

const Signin = () => {
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [openErrorSnackbar, setOpenErrorSnackbar] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const [inputData, setInputData] = useState({ email: '', password: '' });
  const dispatch = useDispatch();
  const token = localStorage.getItem('jwt');
  const auth = useSelector((store) => store.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(''); // Reset error message
    try {
      await dispatch(login(inputData));
      setOpenSnackbar(true);
    } catch (error) {
      setOpenErrorSnackbar(true);
      setErrorMessage('Login failed. Please check your credentials.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputData((values) => ({ ...values, [name]: value }));
  };

  const handleSnackbarClose = () => {
    setOpenSnackbar(false);
  };

  const handleErrorSnackbarClose = () => {
    setOpenErrorSnackbar(false);
  };

  useEffect(() => {
    if (token || (auth.reqUser && auth.reqUser.full_name)) {
      console.log('Component mounted  1');
        navigate('/');
    }
}, [token, auth.reqUser?.full_name, navigate]); // Check for necessary dependencies only


  return (
    <div>
      <div className="flex justify-center h-screen items-center bg-gradient-to-r from-blue-500 to-purple-600 p-8">
        <div className="w-[30%] p-10 bg-white/20 backdrop-blur-lg rounded-lg shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && <p className="text-red-600">{errorMessage}</p>}
            <div>
              <p className="mv-2">Email</p>
              <input
                type="text"
                className="py-2 outline outline-white w-full rounded-md border"
                placeholder="Enter your email"
                onChange={handleChange}
                name="email"
                value={inputData.email}
              />
            </div>

            <div>
              <p className="mv-2">Password</p>
              <input
                type="password"
                className="py-2 outline outline-white w-full rounded-md border"
                placeholder="Enter your password"
                onChange={handleChange}
                name="password"
                value={inputData.password}
              />
            </div>

            <div>
              <Button variant="contained" type="submit" className="w-full">
                Sign in
              </Button>
            </div>
          </form>
          <div className="flex space-x-3 items-center mt-5">
            <p className="m-0">Create New Account</p>
            <Button variant="contained" onClick={() => navigate('/signup')}>
              Signup
            </Button>
          </div>
        </div>
      </div>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          variant="filled"
          sx={{
            width: '100%',
            bgcolor: 'blue.600',
            color: 'white',
          }}
        >
          Login successful!
        </Alert>
      </Snackbar>

      <Snackbar
        open={openErrorSnackbar}
        autoHideDuration={6000}
        onClose={handleErrorSnackbarClose}
      >
        <Alert onClose={handleErrorSnackbarClose} severity="error" variant="filled">
          {errorMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Signin;
