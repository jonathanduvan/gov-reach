import { API_BASE_URL } from "../config";


const LoginPage = () => {
    return (
        <div>
            <h1>Welcome to GovReach</h1>
            <p>Login to start sending advocacy emails.</p>
            <a href={`${API_BASE_URL}/auth/google`}>
                <button>Login with Google</button>
            </a>
            <a href={`${API_BASE_URL}/auth/microsoft`}>
                <button>Login with Microsoft</button>
            </a>
        </div >
    );
};

export default LoginPage;
