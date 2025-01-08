
# 🍽️ BiteManager Backend Server

This is the backend server for the BiteManager project, built with Node.js and Express.js. It provides APIs for managing users, food items, and purchases in the BiteManager restaurant management system.

---

## 🔗 Live Server URL  
- [BiteManager Backend (Hosted on Vercel)](https://bite-manager-server.vercel.app)

---

## 🚀 Features  

### Authentication  
- **JWT-based Authentication**: Secures private routes with token-based validation.
- **Cookie Management**: Secure HTTP-only cookies for storing tokens.

### User Management  
- Create and manage users with email-based identification.
- Ensures existing users are not duplicated during signup.

### Food Management  
- Add, update, and delete food items.
- Fetch food items with search, pagination, and filtering.
- Secure operations using token validation.

### Purchase Management  
- Manage purchase orders, ensuring proper stock updates.
- Prevents users from purchasing their own food items.
- Provides detailed purchase history with food details.

---

## 🛠️ Technologies Used  

### Backend  
- **Node.js**: Backend runtime.  
- **Express.js**: Framework for building APIs.  
- **MongoDB**: Database for storing data.  
- **JWT**: For secure authentication.  
- **dotenv**: For environment variable management.  

### Middleware  
- **CORS**: Handles cross-origin resource sharing.  
- **cookie-parser**: For handling cookies.  

---

## 🔧 Setup Instructions  

### Prerequisites  
- Node.js (v14 or higher)  
- MongoDB (local or cloud database)  
- Environment variables configured in a `.env` file  

---

### Installation  

1. **Clone the repository**:  
   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```

2. **Install dependencies**:  
   ```bash
   npm install
   ```

3. **Set up environment variables**:  
   Create a `.env` file in the root directory with the following variables:  
   ```env
   PORT=5000
   DB_USER=<your-mongodb-user>
   DB_PASS=<your-mongodb-password>
   JWT_SECRET=<your-jwt-secret>
   NODE_ENV=development
   ```

4. **Start the server**:  
   ```bash
   npm start
   ```
   The server will be accessible at `http://localhost:5000`.

---

## 📄 API Endpoints  

### Authentication  
- **POST `/jwt`**  
  Generates a JWT token and sets it in an HTTP-only cookie.  

- **POST `/logout`**  
  Clears the authentication token from the cookies.  

---

### User Management  
- **POST `/users`**  
  Adds a new user if they are not already registered.  

- **GET `/users`**  
  Retrieves all users (requires a valid token).  

---

### Food Management  
- **GET `/foods`**  
  Retrieves food items with optional filtering, pagination, and search.  

- **GET `/limitFoods`**  
  Retrieves a limited number of food items, optionally sorted.  

- **GET `/food/:id`**  
  Retrieves details of a single food item by its ID.  

- **POST `/foods`**  
  Adds a new food item (requires a valid token).  

- **PUT `/foods/:id`**  
  Updates a food item by its ID (requires a valid token).  

---

### Purchase Management  
- **GET `/purchase`**  
  Retrieves purchase history for the logged-in user.  

- **POST `/purchase`**  
  Adds a new purchase entry and updates the food stock.  

- **DELETE `/purchase/:id`**  
  Deletes a purchase entry and restores food stock.  

---

## 📌 Security Features  
- Environment variables for sensitive information like JWT secrets and database credentials.  
- Token-based authentication with JWT for secure APIs.  
- Role-based restrictions on critical actions like adding and updating food items.  

---

## 🌟 Additional Notes  
- This backend server is deployed on Vercel and can be accessed at the live server URL mentioned above.  
- Designed for seamless integration with the BiteManager frontend.

---

