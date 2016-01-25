import collections

from website.apps.django_maced.utils.maced_creator import BAD_ITEM_NAME_CHARACTERS


class MissingFromPost:
    pass


# if not isinstance(field, models.fields.AutoField):  # We don't set auto fields
#     if isinstance(field, models.fields.DateTimeField):  # Not supported yet
#         continue
#     elif isinstance(field, (models.fields.TextField, models.fields.CharField)):
#         pass
#     elif isinstance(field, models.fields.related.ForeignKey):  # Ignore warning. It is valid.
#         pass


# Something I found here: http://stackoverflow.com/questions/3232943/update-value-of-a-nested-dictionary-of-varying-depth
def update_dictionary(dictionary_to_update, dictionary_to_update_with):
    for key, value in dictionary_to_update_with.iteritems():
        if isinstance(value, collections.Mapping):
            recursion = update_dictionary(dictionary_to_update.get(key, {}), value)
            dictionary_to_update[key] = recursion
        else:
            dictionary_to_update[key] = dictionary_to_update_with[key]

    return dictionary_to_update


def is_item_name_valid(item_name):
    if any((character in BAD_ITEM_NAME_CHARACTERS) for character in item_name):
        return False

    return True


def get_bad_item_name_characters_in_string(add_quotes=False):
    string = ""

    for character in BAD_ITEM_NAME_CHARACTERS:
        if add_quotes:
            string += '"'

        string += character

        if add_quotes:
            string += '"'

        string += " "

    string.rstrip()

    return string