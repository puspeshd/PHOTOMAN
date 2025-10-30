FOR BACKEND

go to backend folder 

pip install -r requirements.txt

and then 

uvicorn app:app --host 0.0.0.0 --reload



FOR FRONTEND

go to frontend folder

install NPM 
https://nodejs.org/en/download


then, 
npm install -f
npm run dev -- --host


NOTE : NEED TO CHANGE THE URLS from both frontend and backend from http://43.230.201.125:60025 to http://your backend url : port (for example if running on local computer set to http://localhost:8000)
