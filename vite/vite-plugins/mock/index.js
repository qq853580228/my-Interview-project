import mockjs from "mockjs";

export default [
    {
        url: '/api/user/list',
        method: 'GET',
        delay: 300,
        response: () => {
            return {
                code: 209,
                msg: 'success',
                data: mockjs.mock({
                    "data|20": [
                        {
                            id: '@id',
                            name: '@name',
                            age: '@integer(18, 60)',
                            email: '@email'
                        }
                    ]
                })
            }
        }
    }
]