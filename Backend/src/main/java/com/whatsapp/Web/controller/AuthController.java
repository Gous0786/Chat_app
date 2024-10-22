package com.whatsapp.Web.controller;
import com.whatsapp.Web.config.TokenProvider;
import com.whatsapp.Web.exception.UserException;
import com.whatsapp.Web.model.User;
import com.whatsapp.Web.repository.UserRepository;
import com.whatsapp.Web.request.LoginRequest;
import com.whatsapp.Web.response.AuthResponse;
import com.whatsapp.Web.service.CustomUserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenProvider tokenProvider;
    private final CustomUserService customUserService;

    // Constructor-based Dependency Injection
    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, TokenProvider tokenProvider, CustomUserService customUserService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.customUserService = customUserService;
    }

    @PostMapping(value = "/signup", consumes = "application/json", produces = "application/json")
    public ResponseEntity<AuthResponse> createUserHandler(@RequestBody User user) throws UserException {
        String email = user.getEmail();
        String fullName = user.getFull_name();
        String password = user.getPassword();

        // Check if the email is already registered
        User existingUser = userRepository.findByEmail(email);
        if (existingUser != null) {
            throw new UserException("Email is already used with another account: " + email);
        }

        // Create a new user
        User newUser = new User();
        newUser.setEmail(email);
        newUser.setFull_name(fullName);
        newUser.setPassword(passwordEncoder.encode(password));
        userRepository.save(newUser);

        // Authenticate the user after signup
        Authentication authentication = new UsernamePasswordAuthenticationToken(email, password);
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Generate JWT token
        String jwt = tokenProvider.generateToken(authentication);

        // Create response
        AuthResponse response = new AuthResponse(jwt, true);
        return new ResponseEntity<>(response, HttpStatus.CREATED);  // Use 201 for resource creation
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> loginHandler(@RequestBody LoginRequest req) {
        String email = req.getEmail();
        String password = req.getPassword();

        try {
            // Authenticate the user
            Authentication authentication = authenticate(email, password);
            SecurityContextHolder.getContext().setAuthentication(authentication);

            // Generate JWT token
            String jwt = tokenProvider.generateToken(authentication);

            // Create response
            AuthResponse response = new AuthResponse(jwt, true);
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (BadCredentialsException e) {
            // Return 401 Unauthorized in case of invalid credentials
            return new ResponseEntity<>(new AuthResponse(null, false), HttpStatus.UNAUTHORIZED);
        }
    }

    // Helper method for authentication
    private Authentication authenticate(String username, String password) {
        UserDetails userDetails = customUserService.loadUserByUsername(username);

        if (userDetails == null) {
            throw new BadCredentialsException("Invalid username: " + username);
        }

        if (!passwordEncoder.matches(password, userDetails.getPassword())) {
            throw new BadCredentialsException("Invalid password or username.");
        }

        return new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
    }
}
