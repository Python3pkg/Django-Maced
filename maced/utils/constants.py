MERGE = "merge"
ADD = "add"
CLONE = "clone"
EDIT = "edit"
DELETE = "delete"
GET = "get"
INFO = "info"
AUTHENTICATE = "authenticate"

# Action types of "clone" and "info" will be added later. "info" is not really an action, but for the sake of ease of
# use, it will be considered one. Do not confuse "get" (grabs field data) with "info" (grabs special stats and special
# hidden field data that "get" doesn't get)
PRIMARY_ACTION_TYPES = [ADD, EDIT, MERGE, DELETE]
SECONDARY_ACTION_TYPES = [GET]
SPECIAL_ACTION_TYPES = [AUTHENTICATE]
ALL_ACTION_TYPES = PRIMARY_ACTION_TYPES + SECONDARY_ACTION_TYPES + SPECIAL_ACTION_TYPES

MACED = "maced"
TEXT = "text"
COLOR = "color"
SELECT = "select"

VALID_INPUT_TYPES = [MACED, TEXT, COLOR, SELECT]

OBJECT = "object"
STRING = "string"

VALID_SELECT_TYPES = [OBJECT, STRING]