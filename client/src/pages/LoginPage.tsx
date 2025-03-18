const LoginPage = () => {
    return (
        <div>
            <h1>Welcome to GovReach</h1>
            <p>Login to start sending advocacy emails.</p>
            <a href="http://localhost:4000/auth/google">
                <button>Login with Google</button>
            </a>
            <a href="http://localhost:4000/auth/microsoft">
                <button>Login with Microsoft</button>
            </a>
        </div>
    );
};

export default LoginPage;
