from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

# --- CONFIGURATION ---
SECRET_KEY = "your-super-secret-key-change-in-production"  # Use environment variables in production!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours token validity

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

router = APIRouter(tags=["Authentication"])

# --- IN-MEMORY / DB USER STORE (Mock simulation for demo/MVP, can link to SQLite/PostgreSQL) ---
# Roles: "admin" can manage guidelines/users, "editor" can run compliance scans.
FAKE_USERS_DB = {
    "admin@brandguard.ai": {
        "username": "admin@brandguard.ai",
        "full_name": "Anurag Admin",
        "hashed_password": pwd_context.hash("admin123"),
        "role": "admin",
    },
    "editor@brandguard.ai": {
        "username": "editor@brandguard.ai",
        "full_name": "Marketing Editor",
        "hashed_password": pwd_context.hash("editor123"),
        "role": "editor",
    }
}

# --- PYDANTIC SCHEMAS ---
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class UserResponse(BaseModel):
    username: str
    full_name: Optional[str] = None
    role: str

# --- UTILITIES ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_user(db, username: str):
    if username in db:
        return db[username]
    return None

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- AUTH ENDPOINT ---
def authenticate_user(users_db, username, password):
    if username not in users_db:
        return False
    user = users_db[username]
    if not pwd_context.verify(password, user["hashed_password"]):
        return False
    return user
@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(FAKE_USERS_DB, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"], "role": user.get("role", "editor"), "full_name": user.get("full_name", user["username"])}
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "username": user["username"],
        "full_name": user.get("full_name", "User"),
        "role": user.get("role", "editor")
    }

# --- DEPENDENCY INJECTION FOR RBAC ---
async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = get_user(FAKE_USERS_DB, username)
    if user is None:
        raise credentials_exception
    return user

def require_role(required_role: str):
    """Factory dependency to enforce Role-Based Access Control (RBAC)"""
    def role_dependency(current_user: dict = Depends(get_current_user)):
        if current_user["role"] != required_role and current_user["role"] != "admin":  # admin overrides
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Requires '{required_role}' role."
            )
        return current_user
    return role_dependency


class UserRegister(BaseModel):
    username: str
    password: str
    full_name: str
    role: str = "editor"

@router.post("/register")
async def register_user(user_data: UserRegister):
    if user_data.username in FAKE_USERS_DB:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    FAKE_USERS_DB[user_data.username] = {
        "username": user_data.username,
        "full_name": user_data.full_name,
        "hashed_password": pwd_context.hash(user_data.password),
        "role": user_data.role,
    }
    return {"status": "success", "message": "User registered successfully"}
