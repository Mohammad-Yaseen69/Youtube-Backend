class ApiResponse {
    constructor( message, data , statusCode) {
        this.success = statusCode < 400;
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
    }
}

export {ApiResponse}