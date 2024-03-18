const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const groupsTableName = process.env.GROUPS_TABLE; // Make sure this environment variable is set to your DynamoDB table name

exports.handler = async (event) => {
    const { groupId, userId } = JSON.parse(event.body);

    try {
        // Retrieve the current state of the group, including its maxMembers attribute
        const groupData = await dynamoDb.get({
            TableName: groupsTableName,
            Key: { groupId },
        }).promise();

        let group = groupData.Item;
        if (!group) {
            // Group not found; optionally handle group creation or return an error
            return { 
                statusCode: 404, 
                body: JSON.stringify({ message: "Group not found.", action: 'joinGroup' }),
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "OPTIONS,POST"
                }  
            };
        }

        if (!userId) {
            // Group not found; optionally handle group creation or return an error
            return { 
                statusCode: 404, 
                body: JSON.stringify({ message: "No user given.", action: 'joinGroup' }),
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "OPTIONS,POST"
                }  
            };
        }

        // Ensure the group does not exceed the maximum number of members
        const maxMembers = group.maxMembers || Infinity; // Fallback to Infinity if maxMembers is not set, effectively no limit
        if (group.members && group.members.length >= maxMembers) {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ message: "Group has reached its maximum number of members.", action: 'joinGroup' }), 
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "OPTIONS,POST"
                }  
            };
        }

        // Check if the user is already a member of the group
        if (!group.members || !group.members.includes(userId)) {
            // Add the user to the members array
            const newMembers = group.members ? [...group.members, userId] : [userId];

            // Update the group in the database to include the new member
            await dynamoDb.update({
                TableName: groupsTableName,
                Key: { groupId },
                UpdateExpression: "SET members = :newMembers",
                ExpressionAttributeValues: {
                    ":newMembers": newMembers,
                },
            }).promise();

            return { 
                statusCode: 200, 
                body: JSON.stringify({ message: 'User joined the group successfully.', action: 'joinGroup' }),
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "OPTIONS,POST"
                }  
            };
        } else {
            // User is already a member of the group
            return { 
                statusCode: 200, 
                body: JSON.stringify({ message: 'User is already a member of the group.', action: 'joinGroup' }),
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Methods": "OPTIONS,POST"
                }  
            };
        }
    } catch (err) {
        console.error('Error joining group:', err);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ message: 'Failed to join group', action: 'joinGroup' }), 
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "OPTIONS,POST"
            }  
        };
    }
};
